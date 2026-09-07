import { Router } from "express";
import { DashboardController } from "./dashboardController";
import { authenticate, requireOrganization } from "../../middleware/authenticate";

const router = Router();

router.use(authenticate);
router.use(requireOrganization);

// GET /dashboard — dashboard data scoped by role
router.get("/", (req, res, next) => DashboardController.getDashboard(req, res, next));

export { router as dashboardRoutes };
