import { Router, IRouter } from "express";

import { ProjectController } from "@/controllers/project.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { validate, validationSchemas } from "@/middleware/validation.middleware";
import { Scope } from "@/types";

const router: IRouter = Router();
const controller = new ProjectController();

// All routes require authentication
router.use(authenticate);

// Project CRUD operations
router.get(
  "/",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
  }),
  controller.getAllProjects
);

router.get(
  "/:projectId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getProjectById
);

router.post(
  "/",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
  }),
  validate(validationSchemas.createProject),
  controller.createProject
);

router.put(
  "/:projectId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  validate(validationSchemas.updateProject),
  controller.updateProject
);

router.delete(
  "/:projectId",
  requireScopes({
    scopes: [Scope.PROJECTS_DELETE],
    projectSpecific: true,
  }),
  controller.deleteProject
);

// Project settings
router.get(
  "/:projectId/settings",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getProjectSettings
);

router.put(
  "/:projectId/settings",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.updateProjectSettings
);

// Project API key management
router.post(
  "/:projectId/api-keys",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.createProjectApiKey
);

router.get(
  "/:projectId/api-keys",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getProjectApiKeys
);

router.delete(
  "/:projectId/api-keys/:keyId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.deleteProjectApiKey
);

// Project statistics
router.get(
  "/:projectId/stats",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getProjectStats
);

export default router;
