import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { env } from "../config/env";
import { Finding, SEVERITY_WEIGHT, type FindingSeverity } from "../models/Finding";
import { Chunk } from "../models/Chunk";
import { Audit } from "../models/Audit";
import pino from "pino";

const logger = pino({ name: "FindingExtractionService" });

// Zod schema for a single extracted finding
const findingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum([
    "Labour & HR",
    "Safety",
    "Environment",
    "Governance",
    "Worker Wellbeing",
    "Grievance & Harassment",
    "Wages & Working Hours",
  ]),
  severity: z.enum(["Critical", "High", "Medium", "Low"]),
  risk_reason: z.string(),
  evidence_text: z.string(),
  source_page: z.number().optional(),
  source_section: z.string().optional(),
  recommended_action: z.string(),
  suggested_owner: z.string().optional(),
  suggested_deadline: z.string().optional(),
  confidence_signal: z.enum([
    "strong_evidence",
    "limited_evidence",
    "needs_review",
    "evidence_not_found",
  ]),
});

const findingsArraySchema = z.array(findingSchema);

// The system prompt for finding extraction
const SYSTEM_PROMPT = `You are an expert sustainability, social-compliance, and HRDD auditor.
Analyze the following text and extract all risk findings.

For each finding:
- title: concise finding title
- description: detailed description
- category: one of [Labour & HR, Safety, Environment, Governance, Worker Wellbeing, Grievance & Harassment, Wages & Working Hours]
- severity: Critical | High | Medium | Low
- risk_reason: why this severity was assigned
- evidence_text: direct quote from the text
- source_page: page number
- source_section: section heading
- recommended_action: what should be done
- suggested_owner: role/department responsible
- suggested_deadline: suggested timeline
- confidence_signal: strong_evidence | limited_evidence | needs_review | evidence_not_found

Return JSON array. Return [] if no findings.`;

// Architecture: 3000-token windows
const WINDOW_SIZE = 3000 * 4; // approximate chars for 3000 tokens

class FindingExtractionService {
  private llm: ChatGoogleGenerativeAI;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      model: env.GOOGLE_CHAT_MODEL,
      apiKey: env.GOOGLE_API_KEY,
      temperature: 0.1,
      maxOutputTokens: 4096,
    });
  }

  /**
   * Extract findings from all chunks of a document
   */
  async extractFromDocument(documentId: string): Promise<number> {
    const chunks = await Chunk.find({ documentId }).sort({ chunkIndex: 1 });
    if (chunks.length === 0) {
      logger.warn({ documentId }, "No chunks found for document");
      return 0;
    }

    // Clean up any existing findings for this document (from previous retry attempts)
    await Finding.deleteMany({ documentId });

    const firstChunk = chunks[0];
    const auditId = firstChunk.auditId.toString();
    const organizationId = firstChunk.organizationId.toString();

    let totalFindings = 0;

    // Process chunks in windows of ~3000 tokens
    let windowText = "";
    let windowChunks: typeof chunks = [];

    for (const chunk of chunks) {
      const candidateText = windowText + "\n\n" + chunk.text;

      if (candidateText.length > WINDOW_SIZE && windowChunks.length > 0) {
        // Process current window
        const findings = await this.extractFromText(
          windowText,
          windowChunks[0].pageStart,
          windowChunks[windowChunks.length - 1].pageEnd,
        );

        // Save findings
        for (const f of findings) {
          await this.saveFinding(f, {
            auditId,
            organizationId,
            documentId,
          });
          totalFindings++;
        }

        // Start new window
        windowText = chunk.text;
        windowChunks = [chunk];
      } else {
        windowText = candidateText;
        windowChunks.push(chunk);
      }
    }

    // Process remaining window
    if (windowText.trim()) {
      const findings = await this.extractFromText(
        windowText,
        windowChunks[0].pageStart,
        windowChunks[windowChunks.length - 1].pageEnd,
      );

      for (const f of findings) {
        await this.saveFinding(f, {
          auditId,
          organizationId,
          documentId,
        });
        totalFindings++;
      }
    }

    // Update audit finding counts
    await this.updateAuditFindingCounts(auditId);

    logger.info(
      { documentId, totalFindings },
      "Finding extraction completed",
    );

    return totalFindings;
  }

  /**
   * Extract findings from a text window using LLM
   */
  private async extractFromText(
    text: string,
    pageStart: number,
    pageEnd: number,
  ): Promise<z.infer<typeof findingSchema>[]> {
    const userMessage = `--- Page ${pageStart}${pageEnd > pageStart ? `-${pageEnd}` : ""} ---\n${text}`;

    const response = await this.llm.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);

    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    logger.info(
      { pageStart, pageEnd, contentLength: content.length, preview: content.substring(0, 200) },
      "LLM response received",
    );

    // Parse JSON from response
    const jsonStr = this.extractJson(content);
    const parsed = JSON.parse(jsonStr);

    // Validate with Zod
    const result = findingsArraySchema.safeParse(parsed);

    if (!result.success) {
      logger.warn(
        { errors: result.error.flatten() },
        "LLM output failed Zod validation",
      );
      return [];
    }

    return result.data;
  }

  /**
   * Extract JSON array from LLM response (handles markdown code blocks and truncation)
   */
  private extractJson(content: string): string {
    // Strip markdown code fences
    let cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    // Try full JSON parse first
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[0]);
        return jsonMatch[0];
      } catch {
        // Full parse failed, fall through to object-by-object extraction
      }
    }

    // Extract complete JSON objects one by one (handles truncated responses)
    const objects: string[] = [];
    let depth = 0;
    let inString = false;
    let escape = false;
    let objStart = -1;

    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === "\\") {
        escape = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") {
        if (depth === 0) objStart = i;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && objStart !== -1) {
          const objStr = cleaned.substring(objStart, i + 1);
          try {
            JSON.parse(objStr);
            objects.push(objStr);
          } catch {
            // Skip incomplete/malformed objects
          }
          objStart = -1;
        }
      }
    }

    if (objects.length > 0) {
      return "[" + objects.join(",") + "]";
    }

    return cleaned;
  }

  /**
   * Save a finding to the database
   */
  private async saveFinding(
    finding: z.infer<typeof findingSchema>,
    meta: { auditId: string; organizationId: string; documentId: string },
  ): Promise<void> {
    const severity = finding.severity as FindingSeverity;

    await Finding.create({
      auditId: meta.auditId,
      organizationId: meta.organizationId,
      documentId: meta.documentId,
      title: finding.title,
      description: finding.description,
      category: finding.category,
      severity,
      severityWeight: SEVERITY_WEIGHT[severity],
      riskReason: finding.risk_reason,
      evidenceText: finding.evidence_text,
      sourcePage: finding.source_page,
      sourceSection: finding.source_section,
      recommendedAction: finding.recommended_action,
      suggestedOwner: finding.suggested_owner,
      suggestedDeadline: finding.suggested_deadline,
      confidenceSignal: finding.confidence_signal,
      reviewStatus: "ai_generated",
      status: "Open",
      editedFields: [],
      possibleDuplicateIds: [],
      duplicateResolved: false,
    });
  }

  /**
   * Recalculate and update audit finding counts + risk score
   */
  async updateAuditFindingCounts(auditId: string): Promise<void> {
    const findings = await Finding.find({
      auditId,
      reviewStatus: { $in: ["ai_generated", "approved"] },
    });

    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: findings.length };
    for (const f of findings) {
      if (f.severity === "Critical") counts.critical++;
      else if (f.severity === "High") counts.high++;
      else if (f.severity === "Medium") counts.medium++;
      else counts.low++;
    }

    // Risk score: weighted average (0-4)
    const totalWeight = findings.reduce((sum, f) => sum + f.severityWeight, 0);
    const riskScore =
      findings.length > 0
        ? Math.min(4, totalWeight / findings.length)
        : 0;

    await Audit.findByIdAndUpdate(auditId, {
      findingCounts: counts,
      riskScore,
    });
  }
}

export const findingExtractionService = new FindingExtractionService();
