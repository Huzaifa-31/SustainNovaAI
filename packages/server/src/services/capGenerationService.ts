import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { env } from "../config/env";
import { CAP, Finding, Audit } from "../models";
import type { IFinding, FindingSeverity } from "../models/Finding";
import { googleKeyManager } from "./googleKeyManager";
import pino from "pino";

const logger = pino({ name: "CAPGenerationService" });

type GeminiContentBlock = { text?: unknown };

function extractGeminiText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object") {
          const text = (block as GeminiContentBlock).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (content && typeof content === "object") {
    const text = (content as GeminiContentBlock).text;
    return typeof text === "string" ? text : "";
  }

  return "";
}

const capSchema = z.object({
  rootCause: z.string().min(1),
  correctiveAction: z.string().min(1),
  expectedOutcome: z.string().min(1),
  priority: z.enum(["Critical", "High", "Medium", "Low"]),
  responsibleRole: z.string().min(1),
  suggestedTimeline: z.string().min(1),
});

const SYSTEM_PROMPT = `You are an expert sustainability, social compliance, and HRDD corrective action planner.
Given an audit finding, generate a structured Corrective Action Plan (CAP).

Return JSON with these fields:
- rootCause: the likely root cause of the finding
- correctiveAction: detailed, actionable corrective steps
- expectedOutcome: what successful remediation looks like
- priority: one of [Critical, High, Medium, Low] — should match or be driven by the finding severity
- responsibleRole: the role/department responsible (e.g., HR Manager, EHS Manager, Factory Manager)
- suggestedTimeline: a realistic timeline for completion (e.g., "30 days", "60 days", "90 days")

Return ONLY a JSON object, no markdown, no explanation.`;

class CAPGenerationService {
  private createLLM(apiKey: string) {
    return new ChatGoogleGenerativeAI({
      model: env.GOOGLE_CHAT_MODEL,
      apiKey,
      temperature: 0.2,
      maxOutputTokens: 2048,
    });
  }

  /**
   * Generate CAPs for all approved/ai_generated findings in an audit
   */
  async generateForAudit(auditId: string): Promise<number> {
    const findings = await Finding.find({
      auditId,
      reviewStatus: { $in: ["ai_generated", "approved"] },
    });

    let generated = 0;
    for (const finding of findings) {
      const exists = await CAP.findOne({ findingId: finding._id });
      if (exists) continue;

      await this.generateForFinding(finding);
      generated++;
    }

    logger.info({ auditId, generated }, "CAP generation completed for audit");
    await this.updateAuditCapCounts(auditId);
    return generated;
  }

  /**
   * Generate a single CAP for a finding
   */
  async generateForFinding(finding: IFinding): Promise<void> {
    try {
      const response = await googleKeyManager.withFallback((apiKey) =>
        this.createLLM(apiKey).invoke([
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              title: finding.title,
              description: finding.description,
              category: finding.category,
              severity: finding.severity,
              evidenceText: finding.evidenceText,
              recommendedAction: finding.recommendedAction,
              suggestedOwner: finding.suggestedOwner,
            }),
          },
        ]),
      );

      const content = extractGeminiText(response.content);
      if (!content) {
        throw new Error("Gemini returned an empty text response");
      }

      const jsonStr = this.extractJson(content);
      const parsed = JSON.parse(jsonStr);
      const result = capSchema.safeParse(parsed);

      if (!result.success) {
        logger.warn(
          { findingId: finding._id, errors: result.error.flatten() },
          "CAP schema validation failed",
        );
        return;
      }

      await CAP.create({
        findingId: finding._id,
        auditId: finding.auditId,
        organizationId: finding.organizationId,
        rootCause: result.data.rootCause,
        correctiveAction: result.data.correctiveAction,
        expectedOutcome: result.data.expectedOutcome,
        priority: result.data.priority,
        responsibleRole: result.data.responsibleRole,
        suggestedTimeline: result.data.suggestedTimeline,
        status: "draft",
        humanApproved: false,
        comments: [],
        isOverdue: false,
      });

      logger.info({ findingId: finding._id }, "CAP generated");
    } catch (error) {
      logger.error(
        { findingId: finding._id, error: (error as Error).message },
        "CAP generation failed for finding",
      );
      throw error;
    }
  }

  /**
   * Update audit CAP status counts
   */
  async updateAuditCapCounts(auditId: string): Promise<void> {
    const caps = await CAP.find({ auditId });

    const counts = { open: 0, inProgress: 0, closed: 0, overdue: 0 };
    for (const cap of caps) {
      if (cap.status === "draft" || cap.status === "approved" || cap.status === "assigned") {
        counts.open++;
      } else if (cap.status === "in_progress" || cap.status === "evidence_submitted" || cap.status === "review") {
        counts.inProgress++;
      } else if (cap.status === "closed") {
        counts.closed++;
      }
      if (cap.isOverdue) counts.overdue++;
    }

    await Audit.findByIdAndUpdate(auditId, { capStatus: counts });
  }

  private extractJson(content: string): string {
    // Strip code fences if present
    let cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    // Try full object match
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return match[0];

    return cleaned;
  }
}

export const capGenerationService = new CAPGenerationService();
