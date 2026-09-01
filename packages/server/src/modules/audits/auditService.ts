import { Audit } from "../../models/Audit";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";

export class AuditService {
  async create(
    userId: string,
    input: {
      organizationId: string;
      name: string;
      description?: string;
      auditPeriod?: { start?: string; end?: string };
    },
  ) {
    // Verify user belongs to the organization
    await organizationService.verifyMembership(input.organizationId, userId);

    const [audit] = await Audit.create([
      {
        organizationId: input.organizationId,
        createdBy: userId,
        name: input.name,
        description: input.description,
        auditPeriod: input.auditPeriod
          ? {
              start: input.auditPeriod.start ? new Date(input.auditPeriod.start) : undefined,
              end: input.auditPeriod.end ? new Date(input.auditPeriod.end) : undefined,
            }
          : undefined,
      },
    ]);

    return audit;
  }

  async listForOrg(orgId: string, userId: string, query?: { status?: string; page?: number; limit?: number }) {
    await organizationService.verifyMembership(orgId, userId);

    const page = query?.page ?? 1;
    const limit = Math.min(query?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { organizationId: orgId };
    if (query?.status) filter.status = query.status;

    const [audits, total] = await Promise.all([
      Audit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Audit.countDocuments(filter),
    ]);

    return { audits, total, page, limit };
  }

  async listForUser(userId: string) {
    return Audit.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
  }

  async getById(auditId: string, userId: string) {
    const audit = await Audit.findById(auditId).lean();
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(audit.organizationId.toString(), userId);
    return audit;
  }

  async update(auditId: string, userId: string, input: { name?: string; description?: string; status?: string; auditPeriod?: { start?: string; end?: string } }) {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(audit.organizationId.toString(), userId);

    if (input.name !== undefined) audit.name = input.name;
    if (input.description !== undefined) audit.description = input.description;
    if (input.status !== undefined) audit.status = input.status as "active" | "completed" | "archived";
    if (input.auditPeriod) {
      const current: { start?: Date; end?: Date } = audit.auditPeriod ?? {};
      const updated: { start?: Date; end?: Date } = {};
      if (input.auditPeriod.start) updated.start = new Date(input.auditPeriod.start);
      else if (current.start) updated.start = current.start;
      if (input.auditPeriod.end) updated.end = new Date(input.auditPeriod.end);
      else if (current.end) updated.end = current.end;
      audit.auditPeriod = updated as { start: Date; end: Date };
    }

    await audit.save();
    return audit;
  }

  async delete(auditId: string, userId: string) {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(audit.organizationId.toString(), userId);

    audit.status = "archived";
    await audit.save();
    return audit;
  }
}

export const auditService = new AuditService();
