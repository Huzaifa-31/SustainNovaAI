import { Request, Response, NextFunction } from "express";
import { exportService } from "./exportService";
import { exportQuerySchema, executiveReportSchema } from "./exportValidation";
import { auditLogService } from "../auditLogs/auditLogService";

export class ExportController {
  /**
   * GET /export/findings?auditId=...&format=csv|pdf
   */
  static async exportFindings(req: Request, res: Response, next: NextFunction) {
    try {
      const query = exportQuerySchema.parse(req.query);
      const result = await exportService.exportFindings(
        query.auditId,
        req.user!.id,
        query.format,
      );

      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      res.send(result.buffer);

      // Audit log (after send to avoid delaying response)
      try {
        await auditLogService.create({
          organizationId: result.organizationId,
          auditId: query.auditId,
          userId: req.user!.id,
          action: "export.findings",
          entity: "audit",
          entityId: query.auditId,
          details: { format: query.format, filename: result.filename },
        });
      } catch {
        // Non-critical
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /export/caps?auditId=...&format=csv|pdf
   */
  static async exportCaps(req: Request, res: Response, next: NextFunction) {
    try {
      const query = exportQuerySchema.parse(req.query);
      const result = await exportService.exportCaps(
        query.auditId,
        req.user!.id,
        query.format,
      );

      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      res.send(result.buffer);

      try {
        await auditLogService.create({
          organizationId: result.organizationId,
          auditId: query.auditId,
          userId: req.user!.id,
          action: "export.caps",
          entity: "audit",
          entityId: query.auditId,
          details: { format: query.format, filename: result.filename },
        });
      } catch {
        // Non-critical
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /export/report?auditId=...
   */
  static async exportReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = executiveReportSchema.parse(req.query);
      const result = await exportService.exportExecutiveReport(
        query.auditId,
        req.user!.id,
      );

      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      res.send(result.buffer);

      try {
        await auditLogService.create({
          organizationId: result.organizationId,
          auditId: query.auditId,
          userId: req.user!.id,
          action: "export.report",
          entity: "audit",
          entityId: query.auditId,
          details: { filename: result.filename },
        });
      } catch {
        // Non-critical
      }
    } catch (error) {
      next(error);
    }
  }
}
