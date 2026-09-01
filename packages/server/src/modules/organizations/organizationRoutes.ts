import { Router } from "express";
import { organizationController } from "./organizationController";
import { authenticate, authorize } from "../../middleware/authenticate";

const router = Router();

// All org routes require authentication
router.use(authenticate);

router.post("/", (req, res, next) => organizationController.create(req, res, next));
router.get("/", (req, res, next) => organizationController.list(req, res, next));
router.get("/:id", (req, res, next) => organizationController.getById(req, res, next));
router.patch("/:id", (req, res, next) => organizationController.update(req, res, next));
router.post("/:id/members", (req, res, next) => organizationController.addMember(req, res, next));
router.delete("/:id/members/:memberId", (req, res, next) =>
  organizationController.removeMember(req, res, next),
);

export { router as organizationRoutes };
