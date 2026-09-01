import { Finding, IFinding, SEVERITY_WEIGHT, type FindingSeverity } from "../../models/Finding";
import { Audit } from "../../models";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";
import { findingExtractionService } from "../../services/findingExtractionService";

class FindingService {
  /**
   * List findings for an audit with filters
   */
  async listForAudit(
    userId: string,
    query: {
      auditId: string;
      severity?: string;
      category?: string;
      reviewStatus?: string;
      status?: string;
      page: number;
      limit: number;
    },
  ): Promise<{ findings: IFinding[]; total: number }> {
    const audit = await Audit.findById(query.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    const filter: Record<string, unknown> = { auditId: query.auditId };
    if (query.severity) filter.severity = query.severity;
    if (query.category) filter.category = query.category;
    if (query.reviewStatus) filter.reviewStatus = query.reviewStatus;
    if (query.status) filter.status = query.status;

    const [findings, total] = await Promise.all([
      Finding.find(filter)
        .sort({ severityWeight: -1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Finding.countDocuments(filter),
    ]);

    return { findings, total };
  }

  /**
   * Get a single finding
   */
  async getById(id: string, userId: string): Promise<IFinding> {
    const finding = await Finding.findById(id);
    if (!finding) throw AppError.notFound("Finding not found");

    const audit = await Audit.findById(finding.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    return finding;
  }

  /**
   * Update a finding (edit fields, review, change status)
   */
  async update(
    id: string,
    userId: string,
    input: Record<string, unknown>,
  ): Promise<IFinding> {
    const finding = await Finding.findById(id);
    if (!finding) throw AppError.notFound("Finding not found");

    const audit = await Audit.findById(finding.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    // Track edited fields
    const editableFields = [
      "title", "description", "category", "severity",
      "riskReason", "recommendedAction", "suggestedOwner", "suggestedDeadline",
    ];

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && key in finding.toObject()) {
        finding.set(key, value);

        if (editableFields.includes(key)) {
          if (!finding.editedFields.includes(key)) {
            finding.editedFields.push(key);
          }
        }
      }
    }

    // Update severity weight if severity changed
    if (input.severity) {
      finding.severityWeight = SEVERITY_WEIGHT[input.severity as FindingSeverity];
    }

    // Track review info
    if (input.reviewStatus) {
      finding.reviewedBy = userId as unknown as typeof finding.reviewedBy;
      finding.reviewedAt = new Date();
    }

    await finding.save();

    // Recalculate audit counts
    await findingExtractionService.updateAuditFindingCounts(
      finding.auditId.toString(),
    );

    return finding;
  }

  /**
   * Get finding summary stats for an audit
   */
  async getSummary(
    auditId: string,
    userId: string,
  ): Promise<{
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    byReviewStatus: Record<string, number>;
    total: number;
  }> {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    const [bySeverity, byCategory, byStatus, byReviewStatus, totalResult] =
      await Promise.all([
        Finding.aggregate([
          { $match: { auditId: audit._id } },
          { $group: { _id: "$severity", count: { $sum: 1 } } },
        ]),
        Finding.aggregate([
          { $match: { auditId: audit._id } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
        Finding.aggregate([
          { $match: { auditId: audit._id } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Finding.aggregate([
          { $match: { auditId: audit._id } },
          { $group: { _id: "$reviewStatus", count: { $sum: 1 } } },
        ]),
        Finding.countDocuments({ auditId: audit._id }),
      ]);

    const toRecord = (arr: Array<{ _id: string; count: number }>) =>
      arr.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>,
      );

    return {
      bySeverity: toRecord(bySeverity as Array<{ _id: string; count: number }>),
      byCategory: toRecord(byCategory as Array<{ _id: string; count: number }>),
      byStatus: toRecord(byStatus as Array<{ _id: string; count: number }>),
      byReviewStatus: toRecord(byReviewStatus as Array<{ _id: string; count: number }>),
      total: totalResult,
    };
  }
}

export const findingService = new FindingService();
