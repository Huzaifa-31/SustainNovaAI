import { Request, Response, NextFunction } from "express";
import { auditService } from "./auditService";
import { createAuditSchema, updateAuditSchema } from "./auditValidation";

export class AuditController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createAuditSchema.parse(req.body);
      const user = req.user!;
      const audit = await auditService.create(user._id!.toString(), user.role, input);
      res.status(201).json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  }

  async listForOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const userId = user._id!.toString();
      const { status, page, limit, factoryId } = req.query;
      const result = await auditService.listForOrg(req.params.orgId, userId, user.role, {
        status: status as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        factoryId: factoryId as string | undefined,
      });
      res.json({
        success: true,
        data: result.audits,
        meta: { page: result.page, limit: result.limit, total: result.total },
      });
    } catch (error) {
      next(error);
    }
  }

  async listForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const userId = user._id!.toString();
      const organizationId = req.query.organizationId as string | undefined;
      const audits = await auditService.listForUser(userId, user.role, organizationId);
      res.json({ success: true, data: audits });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const audit = await auditService.getById(req.params.id, user._id!.toString(), user.role);
      res.json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateAuditSchema.parse(req.body);
      const user = req.user!;
      const audit = await auditService.update(req.params.id, user._id!.toString(), user.role, input);
      res.json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const audit = await auditService.delete(req.params.id, user._id!.toString(), user.role);
      res.json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
