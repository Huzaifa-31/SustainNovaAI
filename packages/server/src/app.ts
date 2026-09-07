import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { AppError } from "./utils/AppError";
import { openApiSpec } from "./docs/openapi";
import { authRoutes } from "./modules/auth/authRoutes";
import { organizationRoutes } from "./modules/organizations/organizationRoutes";
import { factoryRoutes } from "./modules/factories/factoryRoutes";
import { auditRoutes } from "./modules/audits/auditRoutes";
import { documentRoutes } from "./modules/documents/documentRoutes";
import { findingRoutes } from "./modules/findings/findingRoutes";
import { capRoutes } from "./modules/caps/capRoutes";
import { qaRoutes } from "./modules/qa/qaRoutes";
import { notificationRoutes } from "./modules/notifications/notificationRoutes";
import { exportRoutes } from "./modules/export/exportRoutes";
import { dashboardRoutes } from "./modules/dashboard/dashboardRoutes";
import { authenticate } from "./middleware/authenticate";
import { googleKeyManager } from "./services/googleKeyManager";
import { vectorStoreService } from "./services/vectorStoreService";
import { documentService } from "./modules/documents/documentService";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Swagger UI — mounted before the rate limiter so doc page assets are always accessible
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get("/api/docs.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(openApiSpec);
});

// General rate limiter
app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" } },
  }),
);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many login attempts" } },
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Debug: Google API key health (no external call, so it does not consume quota)
app.get("/api/debug/ai-keys", authenticate, (_req, res) => {
  res.json({
    success: true,
    data: {
      activeKeyIndex: googleKeyManager.activeKeyIndex,
      keyCount: googleKeyManager.hasFallback ? 2 : 1,
      keys: googleKeyManager.getKeyHealth(),
    },
  });
});

// Debug: Vector index info
app.get("/api/debug/vector-index", authenticate, async (_req, res, next) => {
  try {
    const info = await vectorStoreService.getIndexInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    next(error);
  }
});

// Debug: Recreate vector index (drops all chunk vectors)
app.post("/api/debug/reset-vector-index", authenticate, async (_req, res, next) => {
  try {
    await vectorStoreService.recreateIndex();
    const info = await vectorStoreService.getIndexInfo();
    res.json({
      success: true,
      data: info,
      message: "Vector index reset. Reprocess documents to repopulate it.",
    });
  } catch (error) {
    next(error);
  }
});

// Debug: Reprocess all documents from scratch (requires auth)
app.post("/api/debug/reprocess-documents", authenticate, async (req, res, next) => {
  try {
    const result = await documentService.reprocessAll(req.user!.id);
    res.json({
      success: true,
      data: result,
      message: `${result.requeued} document(s) requeued for reprocessing.`,
    });
  } catch (error) {
    next(error);
  }
});

// API v1 routes
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/factories", factoryRoutes);
app.use("/api/v1/audits", auditRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/findings", findingRoutes);
app.use("/api/v1/caps", capRoutes);
app.use("/api/v1/qa", qaRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/export", exportRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

// Multer error handler (file size, etc.)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(AppError.badRequest(`File too large. Maximum size is ${env.MAX_FILE_SIZE_MB}MB.`));
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(AppError.badRequest("Too many files. Maximum 10 files per upload."));
    }
    return next(AppError.badRequest(err.message));
  }
  next(err);
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
});

// Error handler (must be last)
app.use(errorHandler);

export { app };
