import { Router } from "express";
import { auditController } from "./auditController";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

// All audit routes require authentication
router.use(authenticate);

// List audits for the current user (no org context)
router.get("/", (req, res, next) => auditController.listForUser(req, res, next));

// List audits for a specific org
router.get("/org/:orgId", (req, res, next) => auditController.listForOrg(req, res, next));

// Audit CRUD
router.post("/", (req, res, next) => auditController.create(req, res, next));
router.get("/:id", (req, res, next) => auditController.getById(req, res, next));
router.patch("/:id", (req, res, next) => auditController.update(req, res, next));
router.delete("/:id", (req, res, next) => auditController.delete(req, res, next));

export { router as auditRoutes };
