import { Router } from "express";
import { DocumentController } from "./documentController";
import { authenticate } from "../../middleware/authenticate";
import { upload } from "../../middleware/upload";

const router = Router();

// All document routes require authentication
router.use(authenticate);

// Upload documents (multipart form)
router.post("/upload", upload.array("files", 10), DocumentController.upload);

// List documents for an audit
router.get("/", DocumentController.list);

// Get a single document
router.get("/:id", DocumentController.getById);

// Get document processing status (polling endpoint)
router.get("/:id/status", DocumentController.getStatus);

// Delete a document
router.delete("/:id", DocumentController.delete);

// Retry a failed document
router.post("/:id/retry", DocumentController.retry);

export { router as documentRoutes };
