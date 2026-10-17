import { Finding, IFinding, SEVERITY_WEIGHT, type FindingSeverity } from "../../models/Finding";
import mongoose from "mongoose";
import { Audit } from "../../models";
import { Factory } from "../../models/Factory";
import { Organization } from "../../models/Organization";
import type { OrganizationFindingsQuery } from "./findingValidation";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";
import { findingExtractionService } from "../../services/findingExtractionService";
import { auditLogService } from "../auditLogs/auditLogService";

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
   * List findings across an organization (grouped by factory).
   * - organization users: scoped to their own organization(s)
   * - admins: all organizations, optionally narrowed with organizationId
   */
  async listForOrganization(
    user: { id: string; role: string; organizationId?: string },
    query: OrganizationFindingsQuery,
  ) {
    const toObjectId = (value: string, label: string) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw AppError.badRequest(`Invalid ${label}`);
      }
      return new mongoose.Types.ObjectId(value);
    };

    // 1. Resolve which organizations the caller may see (null = all, admin only)
    let orgIds: mongoose.Types.ObjectId[] | null;
    if (user.role === "admin") {
      orgIds = query.organizationId ? [toObjectId(query.organizationId, "organizationId")] : null;
    } else {
      const owned = await Organization.find({
        $or: [{ ownerUserId: user.id }, { memberIds: user.id }],
      })
        .select("_id")
        .lean();
      const ownIds = new Set(owned.map((o) => o._id.toString()));
      if (user.organizationId) ownIds.add(user.organizationId);
      if (ownIds.size === 0) {
        throw AppError.forbidden("You are not a member of any organization");
      }
      if (query.organizationId) {
        if (!ownIds.has(query.organizationId)) {
          throw AppError.forbidden("You are not a member of this organization");
        }
        orgIds = [toObjectId(query.organizationId, "organizationId")];
      } else {
        orgIds = [...ownIds].map((id) => new mongoose.Types.ObjectId(id));
      }
    }

    const orgFilter = orgIds ? { organizationId: { $in: orgIds } } : {};

    // 2. Load audits, factories and organizations in scope
    const [scopeAudits, factories, organizations] = await Promise.all([
      Audit.find(orgFilter).select("name factoryId organizationId").lean(),
      Factory.find(orgFilter).sort({ name: 1 }).lean(),
      Organization.find(orgIds ? { _id: { $in: orgIds } } : {}).select("name").sort({ name: 1 }).lean(),
    ]);

    const orgNameMap = new Map(organizations.map((o) => [o._id.toString(), o.name]));
    const factoryMap = new Map(factories.map((f) => [f._id.toString(), f]));
    const auditMap = new Map(scopeAudits.map((a) => [a._id.toString(), a]));

    // 3. Per-factory severity summary (ignores list filters so the cards stay stable)
    const severityAgg = await Finding.aggregate([
      { $match: { auditId: { $in: scopeAudits.map((a) => a._id) } } },
      { $group: { _id: { auditId: "$auditId", severity: "$severity" }, count: { $sum: 1 } } },
    ]);

    const factoryStats = new Map<string, { total: number; Critical: number; High: number; Medium: number; Low: number }>();
    const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const row of severityAgg as Array<{ _id: { auditId: mongoose.Types.ObjectId; severity: keyof typeof bySeverity }; count: number }>) {
      const audit = auditMap.get(row._id.auditId.toString());
      if (!audit) continue;
      const key = audit.factoryId.toString();
      const stats = factoryStats.get(key) ?? { total: 0, Critical: 0, High: 0, Medium: 0, Low: 0 };
      stats.total += row.count;
      stats[row._id.severity] += row.count;
      factoryStats.set(key, stats);
      bySeverity[row._id.severity] += row.count;
    }

    const factorySummary = factories.map((f) => ({
      _id: f._id.toString(),
      name: f.name,
      location: f.location,
      organizationId: f.organizationId.toString(),
      organizationName: orgNameMap.get(f.organizationId.toString()) ?? "",
      ...(factoryStats.get(f._id.toString()) ?? { total: 0, Critical: 0, High: 0, Medium: 0, Low: 0 }),
    }));

    // 4. Filtered, paginated list
    const listAuditIds = scopeAudits
      .filter(
        (a) =>
          (!query.factoryId || a.factoryId.toString() === query.factoryId) &&
          (!query.auditId || a._id.toString() === query.auditId),
      )
      .map((a) => a._id);

    const filter: Record<string, unknown> = { auditId: { $in: listAuditIds } };
    if (query.severity) filter.severity = query.severity;
    if (query.category) filter.category = query.category;
    if (query.reviewStatus) filter.reviewStatus = query.reviewStatus;
    if (query.status) filter.status = query.status;
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } },
      ];
    }

    const [rawFindings, total] = await Promise.all([
      Finding.find(filter)
        .sort({ severityWeight: -1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Finding.countDocuments(filter),
    ]);

    const findings = rawFindings.map((f) => {
      const audit = auditMap.get(f.auditId.toString());
      const factory = audit ? factoryMap.get(audit.factoryId.toString()) : undefined;
      return {
        ...f,
        auditName: audit?.name ?? "Unknown audit",
        factoryId: audit?.factoryId.toString(),
        factoryName: factory?.name ?? "Unknown factory",
        organizationName: orgNameMap.get(f.organizationId.toString()) ?? "",
      };
    });

    return {
      findings,
      total,
      factories: factorySummary,
      bySeverity,
      organizations:
        user.role === "admin"
          ? organizations.map((o) => ({ _id: o._id.toString(), name: o.name }))
          : undefined,
    };
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

    // Audit log
    try {
      await auditLogService.create({
        organizationId: finding.organizationId.toString(),
        auditId: finding.auditId.toString(),
        userId,
        action: input.reviewStatus ? `finding.${input.reviewStatus}` : "finding.updated",
        entity: "finding",
        entityId: finding._id.toString(),
        details: { changes: Object.keys(input) },
      });
    } catch {
      // Non-critical
    }

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
