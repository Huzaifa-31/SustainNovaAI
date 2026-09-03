import { CAP, ICAP } from "../../models/CAP";
import { Audit } from "../../models";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";
import { capGenerationService } from "../../services/capGenerationService";

class CAPService {
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
    await CAP.findByIdAndDelete(id);
    await capGenerationService.updateAuditCapCounts(auditId);
  }
}

export const capService = new CAPService();
