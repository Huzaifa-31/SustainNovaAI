import { Router } from "express";
import { NotificationController } from "./notificationController";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/", NotificationController.list);
router.get("/unread-count", NotificationController.unreadCount);
router.patch("/:id/read", NotificationController.markAsRead);
router.post("/read-all", NotificationController.markAllAsRead);
router.delete("/:id", NotificationController.delete);

export { router as notificationRoutes };
