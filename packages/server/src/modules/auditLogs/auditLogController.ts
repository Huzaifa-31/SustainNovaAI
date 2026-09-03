import { Request, Response, NextFunction } from "express";
import { auditLogService } from "./auditLogService";
import { listAuditLogsQuerySchema } from "./auditLogValidation";

export class AuditLogController {
  /**
   * GET /audits/:id/logs
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const auditId = req.params.id;
      const query = listAuditLogsQuerySchema.parse(req.query);

      const result = await auditLogService.listForAudit(
        auditId,
        req.user!.id,
        query,
      );

      res.json({
        success: true,
        data: result.logs,
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
}
