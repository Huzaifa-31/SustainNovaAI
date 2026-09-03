import { Router } from "express";
import { QAController } from "./qaController";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.use(authenticate);

// Ask a question (RAG)
router.post("/ask", QAController.ask);

// Get chat history
router.get("/history", QAController.history);

// Clear chat history
router.delete("/history", QAController.clearHistory);

export { router as qaRoutes };
