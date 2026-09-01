import { Request, Response, NextFunction } from "express";
import { authService } from "./authService";
import { registerSchema, loginSchema } from "./authValidation";
import { AppError } from "../../utils/AppError";

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const { user, token } = await authService.register(input);

      res.status(201).json({
        success: true,
        data: {
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const { user, token } = await authService.login(email, password);

      res.json({
        success: true,
        data: {
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.user is set by authenticate middleware
      res.json({ success: true, data: { user: req.user } });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
