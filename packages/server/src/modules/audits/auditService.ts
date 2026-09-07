import mongoose from "mongoose";
import { Audit } from "../../models/Audit";
import { Factory } from "../../models/Factory";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";

export class AuditService {
  async create(
    userId: string,
    role: string,
    input: {
      organizationId: string;
      factoryId: string;
      name: string;
      description?: string;
      previousAuditId?: string;
      auditPeriod?: { start?: string; end?: string };
    },
  ) {
    // Verify user belongs to the organization and factory
    await organizationService.verifyMembership(input.organizationId, userId, role);
    const factory = await Factory.findById(input.factoryId).lean();
    if (!factory) throw AppError.notFound("Factory not found");
    if (factory.organizationId.toString() !== input.organizationId) {
      throw AppError.forbidden("Factory does not belong to this organization");
    }

    const [audit] = await Audit.create([
      {
        organizationId: input.organizationId,
        factoryId: input.factoryId,
        createdBy: userId,
        name: input.name,
        description: input.description,
        previousAuditId: input.previousAuditId,
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

  async listForOrg(orgId: string, userId: string, role: string, query?: { status?: string; page?: number; limit?: number; factoryId?: string }) {
    await organizationService.verifyMembership(orgId, userId, role);

    const page = query?.page ?? 1;
    const limit = Math.min(query?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { organizationId: orgId };
    if (query?.status) filter.status = query.status;
    if (query?.factoryId) filter.factoryId = query.factoryId;

    const [audits, total] = await Promise.all([
      Audit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Audit.countDocuments(filter),
    ]);

    return { audits, total, page, limit };
  }

  async listForUser(userId: string, role: string, organizationId?: string) {
    if (role === "admin") {
      if (organizationId) {
        return Audit.find({ organizationId }).sort({ createdAt: -1 }).lean();
      }
      return Audit.find().sort({ createdAt: -1 }).lean();
    }

    // Organization users see all audits within their organization.
    const targetOrgId = organizationId ?? (await this.resolveUserOrganizationId(userId));
    if (targetOrgId) {
      await organizationService.verifyMembership(targetOrgId, userId, role);
      return Audit.find({ organizationId: targetOrgId }).sort({ createdAt: -1 }).lean();
    }

    return Audit.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
  }

  async getById(auditId: string, userId: string, role: string) {
    const audit = await Audit.findById(auditId).lean();
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(audit.organizationId.toString(), userId, role);
    return audit;
  }

  async update(auditId: string, userId: string, role: string, input: { name?: string; description?: string; status?: string; previousAuditId?: string; auditPeriod?: { start?: string; end?: string } }) {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(audit.organizationId.toString(), userId, role);

    if (input.name !== undefined) audit.name = input.name;
    if (input.description !== undefined) audit.description = input.description;
    if (input.status !== undefined) audit.status = input.status as "active" | "completed" | "archived";
    if (input.previousAuditId !== undefined) {
      audit.previousAuditId = input.previousAuditId
        ? new mongoose.Types.ObjectId(input.previousAuditId)
        : undefined;
    }
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

  async delete(auditId: string, userId: string, role: string) {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(audit.organizationId.toString(), userId, role);

    audit.status = "archived";
    await audit.save();
    return audit;
  }

  private async resolveUserOrganizationId(userId: string): Promise<string | undefined> {
    const user = await User.findById(userId).lean();
    return user?.organizationId?.toString();
  }
}

export const auditService = new AuditService();
