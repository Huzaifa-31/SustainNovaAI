import { Request, Response, NextFunction } from "express";
import { documentService } from "./documentService";
import { AppError } from "../../utils/AppError";
import {
  uploadDocumentSchema,
  getDocumentParamsSchema,
  listDocumentsQuerySchema,
} from "./documentValidation";

export class DocumentController {
  /**
   * POST /documents/upload
   * Upload one or more files to an audit
   */
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        throw AppError.badRequest("No files uploaded");
      }

      const body = uploadDocumentSchema.parse(req.body);
      const files = req.files as Express.Multer.File[];

      const documents = await documentService.uploadMultiple(
        body.auditId,
        req.user!.id,
        files,
      );

      res.status(201).json({
        success: true,
        data: documents,
        message: `${documents.length} document(s) uploaded successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /documents
   * List documents for an audit
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listDocumentsQuerySchema.parse(req.query);

      if (!query.auditId) {
        throw AppError.badRequest("auditId query parameter is required");
      }

      const result = await documentService.listForAudit(
        query.auditId,
        req.user!.id,
        {
          status: query.status,
          page: query.page,
          limit: query.limit,
        },
      );

      res.json({
        success: true,
        data: result.documents,
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
   * GET /documents/:id
   * Get a single document
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const params = getDocumentParamsSchema.parse(req.params);
      const doc = await documentService.getById(params.id, req.user!.id);

      res.json({
        success: true,
        data: doc,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /documents/:id/status
   * Get document processing status (for polling)
   */
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const params = getDocumentParamsSchema.parse(req.params);
      const status = await documentService.getStatus(params.id, req.user!.id);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /documents/:id
   * Delete a document
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const params = getDocumentParamsSchema.parse(req.params);
      await documentService.delete(params.id, req.user!.id);

      res.json({
        success: true,
        message: "Document deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /documents/:id/analyze
   * Trigger AI analysis for an uploaded document
   */
  static async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const params = getDocumentParamsSchema.parse(req.params);
      const doc = await documentService.analyze(params.id, req.user!.id);

      res.json({
        success: true,
        data: doc,
        message: "Document queued for analysis",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /documents/:id/reanalyze
   * Re-run AI analysis on a previously analyzed document
   */
  static async reanalyze(req: Request, res: Response, next: NextFunction) {
    try {
      const params = getDocumentParamsSchema.parse(req.params);
      const doc = await documentService.reanalyze(params.id, req.user!.id);

      res.json({
        success: true,
        data: doc,
        message: "Document queued for re-analysis",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /documents/:id/retry
   * Retry a failed document
   */
  static async retry(req: Request, res: Response, next: NextFunction) {
    try {
      const params = getDocumentParamsSchema.parse(req.params);
      const doc = await documentService.retry(params.id, req.user!.id);

      res.json({
        success: true,
        data: doc,
        message: "Document queued for reprocessing",
      });
    } catch (error) {
      next(error);
    }
  }
}
