import { Router } from "express";
import { authController } from "./authController";
import { authenticate } from "../../middleware/authenticate";

const router = Router();

router.post("/register", (req, res, next) => authController.register(req, res, next));
router.post("/login", (req, res, next) => authController.login(req, res, next));
router.get("/me", authenticate, (req, res, next) => authController.me(req, res, next));

export { router as authRoutes };
