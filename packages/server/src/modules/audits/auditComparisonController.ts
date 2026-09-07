import { Request, Response, NextFunction } from "express";
import { auditComparisonService } from "./auditComparisonService";
import { compareAuditsQuerySchema } from "./auditComparisonValidation";

export class AuditComparisonController {
  /**
   * GET /audits/:id/compare?previousAuditId=...
   */
  static async compare(req: Request, res: Response, next: NextFunction) {
    try {
      const auditId = req.params.id;
      const query = compareAuditsQuerySchema.parse(req.query);

      const result = await auditComparisonService.compare(
        auditId,
        req.user!.id,
        req.user!.role,
        query.previousAuditId,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /audits/compare/reports
   */
  static async listReports(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      const reports = await auditComparisonService.listReports(
        req.user!.id,
        req.user!.role,
        organizationId,
      );

      res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }
}
