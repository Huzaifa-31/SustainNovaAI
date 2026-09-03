import { AuditLog, type IAuditLog } from "../../models/AuditLog";
import { Audit } from "../../models/Audit";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";

export type CreateAuditLogInput = {
  organizationId: string;
  auditId?: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
};

class AuditLogService {
  async create(input: CreateAuditLogInput): Promise<IAuditLog> {
    return AuditLog.create({
      organizationId: input.organizationId,
      auditId: input.auditId,
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      details: input.details,
      timestamp: new Date(),
    });
  }

  async listForAudit(
    auditId: string,
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{ logs: IAuditLog[]; total: number }> {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    const [logs, total] = await Promise.all([
      AuditLog.find({ auditId })
        .sort({ timestamp: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .populate("userId", "name email"),
      AuditLog.countDocuments({ auditId }),
    ]);

    return { logs, total };
  }
}

export const auditLogService = new AuditLogService();
