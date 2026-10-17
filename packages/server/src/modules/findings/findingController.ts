import { Request, Response, NextFunction } from "express";
import { findingService } from "./findingService";
import { AppError } from "../../utils/AppError";
import {
  listFindingsQuerySchema,
  organizationFindingsQuerySchema,
  updateFindingSchema,
  findingParamsSchema,
} from "./findingValidation";

export class FindingController {
  /**
   * GET /findings?auditId=...&severity=...&category=...
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listFindingsQuerySchema.parse(req.query);
      const result = await findingService.listForAudit(req.user!.id, query);

      res.json({
        success: true,
        data: result.findings,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /findings/organization?factoryId=...&severity=...
   * Findings across the caller's organization, with factory breakdown.
   */
  static async listForOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const query = organizationFindingsQuerySchema.parse(req.query);
      const result = await findingService.listForOrganization(
        {
          id: req.user!.id,
          role: req.user!.role,
          organizationId: req.user!.organizationId?.toString(),
        },
        query,
      );

      res.json({
        success: true,
        data: result.findings,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
        },
        factories: result.factories,
        bySeverity: result.bySeverity,
        organizations: result.organizations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /findings/summary?auditId=...
   */
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const auditId = req.query.auditId as string;
      if (!auditId) throw AppError.badRequest("auditId is required");

      const result = await findingService.getSummary(auditId, req.user!.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /findings/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const params = findingParamsSchema.parse(req.params);
      const finding = await findingService.getById(params.id, req.user!.id);

      res.json({
        success: true,
        data: finding,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /findings/:id
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const params = findingParamsSchema.parse(req.params);
      const input = updateFindingSchema.parse(req.body);
      const finding = await findingService.update(
        params.id,
        req.user!.id,
        input,
      );

      res.json({
        success: true,
        data: finding,
      });
    } catch (error) {
      next(error);
    }
  }
}
