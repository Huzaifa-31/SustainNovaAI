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
}
