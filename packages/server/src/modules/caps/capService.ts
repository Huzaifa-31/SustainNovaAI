import mongoose from "mongoose";
import { CAP, ICAP } from "../../models/CAP";
import { Finding } from "../../models/Finding";
import { Factory } from "../../models/Factory";
import { Organization } from "../../models/Organization";
import type { OrganizationCapsQuery } from "./capValidation";
import { Audit } from "../../models";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";
import { capGenerationService } from "../../services/capGenerationService";
import { notificationService } from "../notifications/notificationService";
import { auditLogService } from "../auditLogs/auditLogService";

class CAPService {
  /**
   * List CAPs across an organization (grouped by factory).
   * - organization users: scoped to their own organization(s)
   * - admins: all organizations, optionally narrowed with organizationId
   */
  async listForOrganization(
    user: { id: string; role: string; organizationId?: string },
    query: OrganizationCapsQuery,
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

    // 3. Per-factory summary (ignores list filters so the cards stay stable)
    const statAgg = (await CAP.aggregate([
      { $match: { auditId: { $in: scopeAudits.map((a) => a._id) } } },
      {
        $group: {
          _id: { auditId: "$auditId", status: "$status", priority: "$priority", overdue: "$isOverdue" },
          count: { $sum: 1 },
        },
      },
    ])) as Array<{
      _id: { auditId: mongoose.Types.ObjectId; status: string; priority: string; overdue: boolean };
      count: number;
    }>;

    const emptyStats = () => ({ total: 0, open: 0, inProgress: 0, closed: 0, overdue: 0 });
    const factoryStats = new Map<string, ReturnType<typeof emptyStats>>();
    const totals = emptyStats();
    const byPriority: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };

    for (const row of statAgg) {
      const audit = auditMap.get(row._id.auditId.toString());
      if (!audit) continue;
      const key = audit.factoryId.toString();
      const stats = factoryStats.get(key) ?? emptyStats();
      for (const target of [stats, totals]) {
        target.total += row.count;
        if (["draft", "approved", "assigned"].includes(row._id.status)) target.open += row.count;
        else if (["in_progress", "evidence_submitted", "review"].includes(row._id.status)) target.inProgress += row.count;
        else if (row._id.status === "closed") target.closed += row.count;
        if (row._id.overdue) target.overdue += row.count;
      }
      factoryStats.set(key, stats);
      byPriority[row._id.priority] = (byPriority[row._id.priority] ?? 0) + row.count;
    }

    const factorySummary = factories.map((f) => ({
      _id: f._id.toString(),
      name: f.name,
      location: f.location,
      organizationId: f.organizationId.toString(),
      organizationName: orgNameMap.get(f.organizationId.toString()) ?? "",
      ...(factoryStats.get(f._id.toString()) ?? emptyStats()),
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
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { correctiveAction: { $regex: escaped, $options: "i" } },
        { rootCause: { $regex: escaped, $options: "i" } },
        { responsibleRole: { $regex: escaped, $options: "i" } },
      ];
    }

    const [rawCaps, total] = await Promise.all([
      CAP.aggregate<Record<string, any>>([
        { $match: filter },
        {
          $addFields: {
            priorityWeight: {
              $switch: {
                branches: [
                  { case: { $eq: ["$priority", "Critical"] }, then: 4 },
                  { case: { $eq: ["$priority", "High"] }, then: 3 },
                  { case: { $eq: ["$priority", "Medium"] }, then: 2 },
                  { case: { $eq: ["$priority", "Low"] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
        },
        { $sort: { priorityWeight: -1, createdAt: -1 } },
        { $skip: (query.page - 1) * query.limit },
        { $limit: query.limit },
      ]),
      CAP.countDocuments(filter),
    ]);

    const linkedFindings = await Finding.find({
      _id: { $in: rawCaps.map((c) => c.findingId) },
    })
      .select("title category severity")
      .lean();
    const findingMap = new Map(linkedFindings.map((f) => [f._id.toString(), f]));

    const caps = rawCaps.map((c) => {
      const audit = auditMap.get(c.auditId.toString());
      const factory = audit ? factoryMap.get(audit.factoryId.toString()) : undefined;
      const finding = findingMap.get(c.findingId.toString());
      return {
        ...c,
        auditName: audit?.name ?? "Unknown audit",
        factoryId: audit?.factoryId.toString(),
        factoryName: factory?.name ?? "Unknown factory",
        organizationName: orgNameMap.get(c.organizationId.toString()) ?? "",
        findingTitle: finding?.title,
        findingCategory: finding?.category,
      };
    });

    return {
      caps,
      total,
      factories: factorySummary,
      totals,
      byPriority,
      organizations:
        user.role === "admin"
          ? organizations.map((o) => ({ _id: o._id.toString(), name: o.name }))
          : undefined,
    };
  }

  /**
   * List CAPs for an audit with filters
   */
  async listForAudit(
    userId: string,
    query: {
      auditId: string;
      status?: string;
      priority?: string;
      page: number;
      limit: number;
    },
  ): Promise<{ caps: ICAP[]; total: number }> {
    const audit = await Audit.findById(query.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    const filter: Record<string, unknown> = { auditId: query.auditId };
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;

    const [caps, total] = await Promise.all([
      CAP.find(filter)
        .populate("findingId", "title severity category")
        .sort({ priority: -1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      CAP.countDocuments(filter),
    ]);

    return { caps, total };
  }

  /**
   * Get summary counts for an audit
   */
  async getSummary(auditId: string, userId: string) {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    const caps = await CAP.find({ auditId });

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let open = 0;
    let inProgress = 0;
    let closed = 0;
    let overdue = 0;

    for (const cap of caps) {
      byStatus[cap.status] = (byStatus[cap.status] || 0) + 1;
      byPriority[cap.priority] = (byPriority[cap.priority] || 0) + 1;

      if (
        cap.status === "draft" ||
        cap.status === "approved" ||
        cap.status === "assigned"
      ) {
        open++;
      } else if (
        cap.status === "in_progress" ||
        cap.status === "evidence_submitted" ||
        cap.status === "review"
      ) {
        inProgress++;
      } else if (cap.status === "closed") {
        closed++;
      }

      if (cap.isOverdue) overdue++;
    }

    return {
      byStatus,
      byPriority,
      total: caps.length,
      open,
      inProgress,
      closed,
      overdue,
    };
  }

  /**
   * Get a single CAP
   */
  async getById(id: string, userId: string): Promise<ICAP> {
    const cap = await CAP.findById(id).populate(
      "findingId",
      "title description severity category evidenceText recommendedAction",
    );
    if (!cap) throw AppError.notFound("CAP not found");

    const audit = await Audit.findById(cap.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    return cap;
  }

  /**
   * Generate CAPs for all findings in an audit
   */
  async generateForAudit(auditId: string, userId: string): Promise<number> {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    return capGenerationService.generateForAudit(auditId);
  }

  /**
   * Update a CAP (edit fields, status, progress, due date)
   */
  async update(
    id: string,
    userId: string,
    input: Record<string, unknown>,
  ): Promise<ICAP> {
    const cap = await CAP.findById(id);
    if (!cap) throw AppError.notFound("CAP not found");

    const audit = await Audit.findById(cap.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && key in cap.toObject()) {
        cap.set(key, value);
      }
    }

    await cap.save();
    await capGenerationService.updateAuditCapCounts(cap.auditId.toString());

    await this.logCAPAction(cap, userId, "cap.updated", { changes: input });

    return cap;
  }

  /**
   * Approve or reject a CAP (human approval)
   */
  async approve(
    id: string,
    userId: string,
    approved: boolean,
  ): Promise<ICAP> {
    const cap = await CAP.findById(id);
    if (!cap) throw AppError.notFound("CAP not found");

    const audit = await Audit.findById(cap.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    cap.humanApproved = approved;
    cap.approvedBy = userId as unknown as typeof cap.approvedBy;
    cap.approvedAt = new Date();
    if (approved) {
      cap.status = "approved";
    } else {
      cap.status = "draft";
    }

    await cap.save();
    await capGenerationService.updateAuditCapCounts(cap.auditId.toString());

    await this.logCAPAction(cap, userId, approved ? "cap.approved" : "cap.rejected");

    // Notify organization members when a CAP is approved
    if (approved) {
      try {
        await notificationService.notifyOrganizationMembers(
          cap.organizationId.toString(),
          {
            type: "cap_approval_needed",
            title: "CAP approved",
            message: "A corrective action plan has been approved and is ready for assignment.",
            entityId: cap._id.toString(),
            entityType: "cap",
          },
          { excludeUserId: userId },
        );
      } catch {
        // Non-critical
      }
    }

    return cap;
  }

  /**
   * Assign a CAP to a user
   */
  async assign(
    id: string,
    userId: string,
    assignedToUserId: string,
  ): Promise<ICAP> {
    const cap = await CAP.findById(id);
    if (!cap) throw AppError.notFound("CAP not found");

    const audit = await Audit.findById(cap.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    cap.assignedTo = assignedToUserId as unknown as typeof cap.assignedTo;
    cap.assignedAt = new Date();
    cap.status = "assigned";

    await cap.save();
    await capGenerationService.updateAuditCapCounts(cap.auditId.toString());

    await this.logCAPAction(cap, userId, "cap.assigned", {
      assignedTo: assignedToUserId,
    });

    // Notify assignee
    try {
      await notificationService.create({
        userId: assignedToUserId,
        organizationId: cap.organizationId.toString(),
        type: "cap_assigned",
        title: "CAP assigned to you",
        message: "A corrective action plan has been assigned to you.",
        entityId: cap._id.toString(),
        entityType: "cap",
      });
    } catch {
      // Non-critical: continue even if notification fails
    }

    return cap;
  }

  /**
   * Add a comment to a CAP
   */
  async addComment(
    id: string,
    userId: string,
    text: string,
  ): Promise<ICAP> {
    const cap = await CAP.findById(id);
    if (!cap) throw AppError.notFound("CAP not found");

    const audit = await Audit.findById(cap.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    cap.comments.push({
      userId: userId as unknown as typeof cap.comments[0]["userId"],
      text,
      createdAt: new Date(),
    });

    await cap.save();
    return cap;
  }

  /**
   * Delete a CAP
   */
  async delete(id: string, userId: string): Promise<void> {
    const cap = await CAP.findById(id);
    if (!cap) throw AppError.notFound("CAP not found");

    const audit = await Audit.findById(cap.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    const auditId = cap.auditId.toString();
    await this.logCAPAction(cap, userId, "cap.deleted");
    await CAP.findByIdAndDelete(id);
    await capGenerationService.updateAuditCapCounts(auditId);
  }

  private async logCAPAction(
    cap: ICAP,
    userId: string,
    action: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await auditLogService.create({
        organizationId: cap.organizationId.toString(),
        auditId: cap.auditId.toString(),
        userId,
        action,
        entity: "cap",
        entityId: cap._id.toString(),
        details,
      });
    } catch {
      // Non-critical
    }
  }
}

export const capService = new CAPService();
