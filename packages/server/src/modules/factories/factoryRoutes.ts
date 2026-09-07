import { Router } from "express";
import { authenticate, requireOrganization } from "../../middleware/authenticate";
import { FactoryController } from "./factoryController";

const router = Router();

router.use(authenticate);
router.use(requireOrganization);

router.get("/", (req, res, next) => FactoryController.list(req, res, next));
router.post("/", (req, res, next) => FactoryController.create(req, res, next));
router.get("/stats/:organizationId", (req, res, next) =>
  FactoryController.stats(req, res, next),
);
router.get("/:id", (req, res, next) => FactoryController.getById(req, res, next));
router.patch("/:id", (req, res, next) => FactoryController.update(req, res, next));
router.delete("/:id", (req, res, next) => FactoryController.delete(req, res, next));

export { router as factoryRoutes };
