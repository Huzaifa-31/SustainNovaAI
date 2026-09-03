import { Request, Response, NextFunction } from "express";
import { capService } from "./capService";
import { AppError } from "../../utils/AppError";
import {
  listCapsQuerySchema,
  generateCapsSchema,
  updateCapSchema,
  capParamsSchema,
  addCommentSchema,
  approveCapSchema,
} from "./capValidation";

export class CAPController {
  /**
   * GET /caps?auditId=...&status=...&priority=...
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listCapsQuerySchema.parse(req.query);
      const result = await capService.listForAudit(req.user!.id, query);

      res.json({
        success: true,
        data: result.caps,
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
   * GET /caps/summary?auditId=...
   */
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listCapsQuerySchema.parse(req.query);
      const summary = await capService.getSummary(
        query.auditId,
        req.user!.id,
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /caps/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const params = capParamsSchema.parse(req.params);
      const cap = await capService.getById(params.id, req.user!.id);

      res.json({
        success: true,
        data: cap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /caps/generate
   */
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const body = generateCapsSchema.parse(req.body);
      const generated = await capService.generateForAudit(
        body.auditId,
        req.user!.id,
      );

      res.json({
        success: true,
        data: { generated },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /caps/:id
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const params = capParamsSchema.parse(req.params);
      const input = updateCapSchema.parse(req.body);
      const cap = await capService.update(params.id, req.user!.id, input);

      res.json({
        success: true,
        data: cap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /caps/:id/approve
   */
  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const params = capParamsSchema.parse(req.params);
      const body = approveCapSchema.parse(req.body);
      const cap = await capService.approve(
        params.id,
        req.user!.id,
        body.approved,
      );

      res.json({
        success: true,
        data: cap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /caps/:id/assign
   */
  static async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const params = capParamsSchema.parse(req.params);
      const { assignedTo } = req.body;
      if (!assignedTo || typeof assignedTo !== "string") {
        throw AppError.badRequest("assignedTo is required");
      }

      const cap = await capService.assign(params.id, req.user!.id, assignedTo);

      res.json({
        success: true,
        data: cap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /caps/:id/comments
   */
  static async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const params = capParamsSchema.parse(req.params);
      const body = addCommentSchema.parse(req.body);
      const cap = await capService.addComment(
        params.id,
        req.user!.id,
        body.text,
      );

      res.json({
        success: true,
        data: cap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /caps/:id
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const params = capParamsSchema.parse(req.params);
      await capService.delete(params.id, req.user!.id);

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      next(error);
    }
  }
}
