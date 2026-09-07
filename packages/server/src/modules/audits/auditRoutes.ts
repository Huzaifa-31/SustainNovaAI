import { Router } from "express";
import { auditController } from "./auditController";
import { AuditComparisonController } from "./auditComparisonController";
import { AuditLogController } from "../auditLogs/auditLogController";
import { authenticate, requireOrganization } from "../../middleware/authenticate";

const router = Router();

// All audit routes require authentication and organization/admin access
router.use(authenticate);
router.use(requireOrganization);

// List audits for the current user (no org context)
router.get("/", (req, res, next) => auditController.listForUser(req, res, next));

// List audits for a specific org
router.get("/org/:orgId", (req, res, next) => auditController.listForOrg(req, res, next));

// Audit CRUD
router.post("/", (req, res, next) => auditController.create(req, res, next));
router.get("/:id", (req, res, next) => auditController.getById(req, res, next));
router.patch("/:id", (req, res, next) => auditController.update(req, res, next));
router.delete("/:id", (req, res, next) => auditController.delete(req, res, next));

// Audit comparison reports (global)
router.get("/compare/reports", (req, res, next) =>
  AuditComparisonController.listReports(req, res, next),
);

// Audit comparison
router.get("/:id/compare", (req, res, next) =>
  AuditComparisonController.compare(req, res, next),
);

// Audit trail
router.get("/:id/logs", (req, res, next) =>
  AuditLogController.list(req, res, next),
);

export { router as auditRoutes };
