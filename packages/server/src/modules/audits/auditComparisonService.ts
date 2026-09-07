import { Audit } from "../../models/Audit";
import { Finding } from "../../models/Finding";
import { Organization } from "../../models/Organization";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";

export type ComparisonFinding = {
  _id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  similarity?: number;
};

export type RecurringFinding = {
  current: ComparisonFinding;
  previous: ComparisonFinding;
  similarity: number;
  trend: "improved" | "unchanged" | "worsened";
};

export type AuditComparisonResult = {
  currentAuditId: string;
  previousAuditId: string;
  currentAuditName: string;
  previousAuditName: string;
  newFindings: ComparisonFinding[];
  resolvedFindings: ComparisonFinding[];
  improvedFindings: RecurringFinding[];
  unchangedFindings: RecurringFinding[];
  worsenedFindings: RecurringFinding[];
  recurringFindings: RecurringFinding[];
  summary: {
    currentTotal: number;
    previousTotal: number;
    newCount: number;
    resolvedCount: number;
    improvedCount: number;
    unchangedCount: number;
    worsenedCount: number;
    recurringCount: number;
  };
};

class AuditComparisonService {
  private readonly SIMILARITY_THRESHOLD = 0.65;
  private readonly SEVERITY_WEIGHTS: Record<string, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  /**
   * Compare two audits and classify findings as new, resolved, improved, unchanged, or worsened.
   */
  async compare(
    currentAuditId: string,
    userId: string,
    role: string,
    previousAuditId?: string,
  ): Promise<AuditComparisonResult> {
    const currentAudit = await Audit.findById(currentAuditId);
    if (!currentAudit) throw AppError.notFound("Current audit not found");

    await organizationService.verifyMembership(
      currentAudit.organizationId.toString(),
      userId,
      role,
    );

    const previousId =
      previousAuditId || currentAudit.previousAuditId?.toString();
    if (!previousId) {
      throw AppError.badRequest(
        "No previous audit linked to this audit. Provide previousAuditId or set it on the audit.",
      );
    }

    const previousAudit = await Audit.findById(previousId);
    if (!previousAudit) throw AppError.notFound("Previous audit not found");

    if (
      previousAudit.organizationId.toString() !==
      currentAudit.organizationId.toString()
    ) {
      throw AppError.forbidden(
        "Previous audit belongs to a different organization",
      );
    }

    const [currentFindings, previousFindings] = await Promise.all([
      Finding.find({ auditId: currentAuditId }).lean(),
      Finding.find({ auditId: previousId }).lean(),
    ]);

    const currentMapped = currentFindings.map((f) => this.mapFinding(f));
    const previousMapped = previousFindings.map((f) => this.mapFinding(f));

    const matchedPreviousIds = new Set<string>();
    const recurring: RecurringFinding[] = [];
    const newFindings: ComparisonFinding[] = [];

    for (const current of currentMapped) {
      let bestMatch: { previous: ComparisonFinding; similarity: number } | null =
        null;

      for (const previous of previousMapped) {
        if (matchedPreviousIds.has(previous._id)) continue;

        const similarity = this.calculateSimilarity(
          current.title + " " + current.description,
          previous.title + " " + previous.description,
        );

        if (
          similarity >= this.SIMILARITY_THRESHOLD &&
          (!bestMatch || similarity > bestMatch.similarity)
        ) {
          bestMatch = { previous, similarity };
        }
      }

      if (bestMatch) {
        matchedPreviousIds.add(bestMatch.previous._id);
        const trend = this.classifyTrend(current, bestMatch.previous);
        recurring.push({
          current,
          previous: bestMatch.previous,
          similarity: Number(bestMatch.similarity.toFixed(2)),
          trend,
        });
      } else {
        newFindings.push(current);
      }
    }

    const resolvedFindings = previousMapped.filter(
      (p) => !matchedPreviousIds.has(p._id),
    );

    const improvedFindings = recurring.filter((r) => r.trend === "improved");
    const unchangedFindings = recurring.filter((r) => r.trend === "unchanged");
    const worsenedFindings = recurring.filter((r) => r.trend === "worsened");

    return {
      currentAuditId,
      previousAuditId: previousId,
      currentAuditName: currentAudit.name,
      previousAuditName: previousAudit.name,
      newFindings,
      resolvedFindings,
      improvedFindings,
      unchangedFindings,
      worsenedFindings,
      recurringFindings: recurring,
      summary: {
        currentTotal: currentMapped.length,
        previousTotal: previousMapped.length,
        newCount: newFindings.length,
        resolvedCount: resolvedFindings.length,
        improvedCount: improvedFindings.length,
        unchangedCount: unchangedFindings.length,
        worsenedCount: worsenedFindings.length,
        recurringCount: recurring.length,
      },
    };
  }

  /**
   * List all comparison reports available to a user across their organizations.
   */
  async listReports(userId: string, role: string, organizationId?: string): Promise<
    Array<{
      currentAuditId: string;
      previousAuditId: string;
      currentAuditName: string;
      previousAuditName: string;
      summary: AuditComparisonResult["summary"];
    }>
  > {
    let orgIds: string[] = [];

    if (role === "admin" && organizationId) {
      orgIds = [organizationId];
    } else if (role === "admin") {
      const organizations = await Organization.find().lean();
      orgIds = organizations.map((o) => String(o._id));
    } else {
      const organizations = await organizationService.listForUser(userId, role);
      orgIds = organizations.map((o) => String(o._id));
    }

    if (orgIds.length === 0) return [];

    const audits = await Audit.find({
      organizationId: { $in: orgIds },
      previousAuditId: { $exists: true, $ne: null },
    }).lean();

    const reports: Awaited<ReturnType<typeof this.listReports>> = [];

    for (const audit of audits) {
      try {
        const comparison = await this.compare(
          String(audit._id),
          userId,
          role,
        );
        reports.push({
          currentAuditId: comparison.currentAuditId,
          previousAuditId: comparison.previousAuditId,
          currentAuditName: comparison.currentAuditName,
          previousAuditName: comparison.previousAuditName,
          summary: comparison.summary,
        });
      } catch {
        // Skip audits whose previous audit was deleted or comparison fails
      }
    }

    return reports;
  }

  private classifyTrend(
    current: ComparisonFinding,
    previous: ComparisonFinding,
  ): "improved" | "unchanged" | "worsened" {
    const currentSeverityWeight = this.SEVERITY_WEIGHTS[current.severity] ?? 0;
    const previousSeverityWeight = this.SEVERITY_WEIGHTS[previous.severity] ?? 0;

    const currentClosed = current.status === "Closed";
    const previousClosed = previous.status === "Closed";

    // Status improvement is stronger than severity improvement
    if (currentClosed && !previousClosed) return "improved";
    if (!currentClosed && previousClosed) return "worsened";

    if (currentSeverityWeight < previousSeverityWeight) return "improved";
    if (currentSeverityWeight > previousSeverityWeight) return "worsened";

    return "unchanged";
  }

  private mapFinding(finding: Record<string, unknown>): ComparisonFinding {
    return {
      _id: finding._id as string,
      title: (finding.title as string) || "",
      description: (finding.description as string) || "",
      severity: (finding.severity as string) || "",
      category: (finding.category as string) || "",
      status: (finding.status as string) || "",
    };
  }

  /**
   * Compute cosine similarity between two texts using word frequency vectors.
   */
  private calculateSimilarity(textA: string, textB: string): number {
    const tokensA = this.tokenize(textA);
    const tokensB = this.tokenize(textB);

    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const vocab = new Set([...tokensA, ...tokensB]);
    const freqA = this.frequencyVector(tokensA, vocab);
    const freqB = this.frequencyVector(tokensB, vocab);

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (const word of vocab) {
      const a = freqA[word] || 0;
      const b = freqB[word] || 0;
      dot += a * b;
      magA += a * a;
      magB += b * b;
    }

    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  private frequencyVector(
    tokens: string[],
    vocab: Set<string>,
  ): Record<string, number> {
    const vector: Record<string, number> = {};
    for (const token of tokens) {
      if (vocab.has(token)) {
        vector[token] = (vector[token] || 0) + 1;
      }
    }
    return vector;
  }
}

export const auditComparisonService = new AuditComparisonService();
