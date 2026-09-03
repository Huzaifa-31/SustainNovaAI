import { Router } from "express";
import { CAPController } from "./capController";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.use(authenticate);

// List CAPs for an audit (before :id routes)
router.get("/", CAPController.list);

// Summary endpoint
router.get("/summary", CAPController.summary);

// Generate CAPs for an audit
router.post("/generate", CAPController.generate);

// Get a single CAP
router.get("/:id", CAPController.getById);

// Update a CAP
router.patch("/:id", CAPController.update);

// Approve/reject a CAP
router.post("/:id/approve", CAPController.approve);

// Assign a CAP
router.post("/:id/assign", CAPController.assign);

// Add a comment
router.post("/:id/comments", CAPController.addComment);

// Delete a CAP
router.delete("/:id", CAPController.delete);

export { router as capRoutes };
