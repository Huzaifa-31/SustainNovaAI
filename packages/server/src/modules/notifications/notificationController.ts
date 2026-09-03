import { Request, Response, NextFunction } from "express";
import { notificationService } from "./notificationService";
import {
  listNotificationsQuerySchema,
  notificationParamsSchema,
} from "./notificationValidation";

export class NotificationController {
  /**
   * GET /notifications
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listNotificationsQuerySchema.parse(req.query);
      const result = await notificationService.listForUser(
        req.user!.id,
        query,
      );

      res.json({
        success: true,
        data: result.notifications,
        meta: {
          unreadCount: result.unreadCount,
          total: result.total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(result.total / query.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/unread-count
   */
  static async unreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.user!.id);
      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const params = notificationParamsSchema.parse(req.params);
      const notification = await notificationService.markAsRead(
        params.id,
        req.user!.id,
      );

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /notifications/read-all
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAllAsRead(req.user!.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /notifications/:id
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const params = notificationParamsSchema.parse(req.params);
      await notificationService.delete(params.id, req.user!.id);

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      next(error);
    }
  }
}
