import { Request, Response, NextFunction } from "express";
import { auditService } from "./auditService";
import { createAuditSchema, updateAuditSchema } from "./auditValidation";

export class AuditController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createAuditSchema.parse(req.body);
      const userId = req.user!._id!.toString();
      const audit = await auditService.create(userId, input);
      res.status(201).json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  }

  async listForOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id!.toString();
      const { status, page, limit } = req.query;
      const result = await auditService.listForOrg(req.params.orgId, userId, {
        status: status as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
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
      const userId = req.user!._id!.toString();
      const audits = await auditService.listForUser(userId);
      res.json({ success: true, data: audits });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id!.toString();
      const audit = await auditService.getById(req.params.id, userId);
      res.json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateAuditSchema.parse(req.body);
      const userId = req.user!._id!.toString();
      const audit = await auditService.update(req.params.id, userId, input);
      res.json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id!.toString();
      const audit = await auditService.delete(req.params.id, userId);
      res.json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
