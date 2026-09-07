import { Request, Response, NextFunction } from "express";
import { factoryService } from "./factoryService";
import { createFactorySchema, updateFactorySchema } from "./factoryValidation";

export class FactoryController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const organizationId = req.query.organizationId as string | undefined;
      const factories = await factoryService.listForUser(
        user.id,
        user.role,
        organizationId,
      );
      res.json({ success: true, data: factories });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const factory = await factoryService.getById(req.params.id, user.id, user.role);
      res.json({ success: true, data: factory });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const input = createFactorySchema.parse(req.body);
      const factory = await factoryService.create(user.id, user.role, input);
      res.status(201).json({ success: true, data: factory });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const input = updateFactorySchema.parse(req.body);
      const factory = await factoryService.update(req.params.id, user.id, user.role, input);
      res.json({ success: true, data: factory });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const result = await factoryService.delete(req.params.id, user.id, user.role);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.params.organizationId;
      const stats = await factoryService.getFactoryStats(organizationId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}
