import { Router } from "express";
import { ExportController } from "./exportController";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/findings", ExportController.exportFindings);
router.get("/caps", ExportController.exportCaps);
router.get("/report", ExportController.exportReport);

export { router as exportRoutes };
