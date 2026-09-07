import { Request, Response, NextFunction } from "express";
import { dashboardService } from "./dashboardService";
import { dashboardQuerySchema } from "./dashboardValidation";

export class DashboardController {
  /**
   * GET /dashboard
   * Returns aggregated dashboard data for the current user.
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const query = dashboardQuerySchema.parse(req.query);
      const data = await dashboardService.getDashboard(
        req.user!.id,
        req.user!.role,
        query.organizationId,
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
