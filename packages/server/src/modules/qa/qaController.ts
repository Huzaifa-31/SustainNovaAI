import { Request, Response, NextFunction } from "express";
import { qaBusinessService } from "./qaService";
import {
  askQuestionSchema,
  chatHistoryQuerySchema,
  clearHistorySchema,
} from "./qaValidation";

export class QAController {
  /**
   * POST /qa/ask
   */
  static async ask(req: Request, res: Response, next: NextFunction) {
    try {
      const body = askQuestionSchema.parse(req.body);
      const result = await qaBusinessService.ask(
        body.auditId,
        body.question,
        req.user!.id,
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
   * GET /qa/history?auditId=...
   */
  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      const query = chatHistoryQuerySchema.parse(req.query);
      const result = await qaBusinessService.getHistory(
        query.auditId,
        req.user!.id,
        query.page,
        query.limit,
      );

      res.json({
        success: true,
        data: result.messages,
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
   * DELETE /qa/history
   */
  static async clearHistory(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = clearHistorySchema.parse(req.body);
      await qaBusinessService.clearHistory(body.auditId, req.user!.id);

      res.json({
        success: true,
        data: { cleared: true },
      });
    } catch (error) {
      next(error);
    }
  }
}
