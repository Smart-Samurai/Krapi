import { BackendSDK } from "@krapi/sdk";
import { Router, IRouter } from "express";

import { CollectionsController } from "@/controllers/collections.controller";
import { ProjectController } from "@/controllers/project.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import {
  validate,
  validationSchemas,
} from "@/middleware/validation.middleware";
import { Scope } from "@/types";

const router: IRouter = Router();

const controller = new ProjectController();
const collectionsController = new CollectionsController();

// Initialize the BackendSDK - will be set from app.ts
let _backendSDK: BackendSDK;

export const initializeProjectSDK = (sdk: BackendSDK) => {
  _backendSDK = sdk;
};

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

// Collections routes (inline to avoid mounting issues)
router.get(
  "/:projectId/collections",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  collectionsController.getAllCollections
);

router.get(
  "/:projectId/collections/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  collectionsController.getCollectionByName
);

router.post(
  "/:projectId/collections",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  collectionsController.createCollection
);

router.put(
  "/:projectId/collections/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  collectionsController.updateCollection
);

router.delete(
  "/:projectId/collections/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_DELETE],
    projectSpecific: true,
  }),
  collectionsController.deleteCollection
);

router.post(
  "/:projectId/collections/:collectionName/validate-schema",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  collectionsController.validateCollectionSchema
);

// Collection statistics
router.get(
  "/:projectId/collections/:collectionName/statistics",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  collectionsController.getCollectionStatistics
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

// Project statistics (alias for compatibility)
router.get(
  "/:projectId/statistics",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getProjectStats
);

// Project activity
router.get(
  "/:projectId/activity",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getProjectActivity
);

export default router;
