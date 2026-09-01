import { Router } from "express";
import { FindingController } from "./findingController";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.use(authenticate);

// List findings for an audit (must come before :id routes)
router.get("/", FindingController.list);

// Summary stats
router.get("/summary", FindingController.summary);

// Get a single finding
router.get("/:id", FindingController.getById);

// Update a finding (review, edit, change status)
router.patch("/:id", FindingController.update);

export { router as findingRoutes };
