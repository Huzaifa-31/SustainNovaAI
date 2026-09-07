import { Request, Response, NextFunction } from "express";
import { authService } from "../modules/auth/authService";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: import("../models/User").IUser;
      tokenPayload?: {
        userId: string;
        email: string;
        role: string;
        organizationId?: string;
      };
    }
  }
}

/**
 * Authenticate middleware — extracts and verifies JWT from Authorization header.
 * Attaches the full user document to req.user on success.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw AppError.unauthorized("Authentication token required", "AUTH_TOKEN_MISSING");
    }

    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);

    const user = await User.findById(payload.userId).select("-passwordHash");
    if (!user) {
      throw AppError.unauthorized("User no longer exists", "AUTH_TOKEN_EXPIRED");
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorize middleware factory — restricts access to specific roles.
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}

/**
 * Restrict access to super admins only.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    return next(AppError.forbidden("Admin access required"));
  }
  next();
}

/**
 * Restrict access to organization owners. Admins are also allowed.
 */
export function requireOrganization(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(AppError.unauthorized("Authentication required"));
  }
  if (req.user.role === "admin") {
    return next();
  }
  if (req.user.role === "organization" && req.user.organizationId) {
    return next();
  }
  return next(AppError.forbidden("Organization access required"));
}
