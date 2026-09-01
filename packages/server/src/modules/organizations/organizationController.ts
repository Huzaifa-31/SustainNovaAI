import { Request, Response, NextFunction } from "express";
import { organizationService } from "./organizationService";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema,
} from "./organizationValidation";

export class OrganizationController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createOrganizationSchema.parse(req.body);
      const userId = req.user!._id!.toString();
      const org = await organizationService.create(userId, input);
      res.status(201).json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id!.toString();
      const orgs = await organizationService.listForUser(userId);
      res.json({ success: true, data: orgs });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const org = await organizationService.getById(req.params.id);
      res.json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = updateOrganizationSchema.parse(req.body);
      const userId = req.user!._id!.toString();
      const org = await organizationService.update(req.params.id, userId, input);
      res.json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, role } = addMemberSchema.parse(req.body);
      const userId = req.user!._id!.toString();
      const org = await organizationService.addMember(req.params.id, userId, email, role);
      res.json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!._id!.toString();
      const org = await organizationService.removeMember(req.params.id, userId, req.params.memberId);
      res.json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();
