/**
 * Project Routes
 * 
 * Handles project-related endpoints including CRUD operations, settings, API keys, and collections.
 * Base path: /krapi/k1/projects
 * 
 * Routes:
 * - GET / - Get all projects
 * - GET /:projectId - Get project by ID
 * - POST / - Create project
 * - PUT /:projectId - Update project
 * - DELETE /:projectId - Delete project
 * - GET /:projectId/settings - Get project settings
 * - PUT /:projectId/settings - Update project settings
 * - POST /:projectId/api-keys - Create project API key
 * - GET /:projectId/api-keys - Get project API keys
 * - DELETE /:projectId/api-keys/:keyId - Delete project API key
 * - GET /:projectId/stats - Get project statistics
 * - GET /:projectId/activity - Get project activity
 * - Collections routes (nested under /:projectId/collections)
 * - Documents routes (nested under /:projectId/collections/:collectionName/documents)
 * 
 * All routes require authentication and appropriate scopes.
 * SDK-driven implementation using BackendSDK for all functionality.
 * 
 * @module routes/project.routes
 */
import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Router, IRouter, RequestHandler, Request, Response, NextFunction } from "express";

import { CollectionsController } from "@/controllers/collections.controller";
import { ProjectController } from "@/controllers/project.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import {
  validate,
  validationSchemas,
} from "@/middleware/validation.middleware";
import { DatabaseService } from "@/services/database.service";
import { ExtendedRequest, Scope } from "@/types";

const router: IRouter = Router();

const controller = new ProjectController();
const collectionsController = new CollectionsController();

// Type-safe adapter to convert controller methods to Express RequestHandlers
// This properly handles the ExtendedRequest type that controllers expect
// Controllers use Response<unknown, Record<string, unknown>> but Express provides generic Response
function asRequestHandler(
  handler: (req: ExtendedRequest, res: Response<unknown, Record<string, unknown>>) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req as unknown as ExtendedRequest, res as Response<unknown, Record<string, unknown>>).catch(next);
  };
}

// Initialize the BackendSDK - will be set from app.ts

/**
 * Initialize BackendSDK for project routes
 * 
 * Called from app.ts to set up the BackendSDK instance for project and collections controllers.
 * 
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeProjectSDK = (sdk: BackendSDK) => {
  // Initialize the controller with the SDK instance for SDK-first architecture
  controller.setBackendSDK(sdk);
  // Initialize the collections controller with the SDK instance
  collectionsController.setBackendSDK(sdk);
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
// Get all collections for a project
router.get(
  "/:projectId/collections",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.getAllCollections.bind(collectionsController))
);

// Get a specific collection by name
router.get(
  "/:projectId/collections/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.getCollectionByName.bind(collectionsController))
);

router.post(
  "/:projectId/collections",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.createCollection.bind(collectionsController))
);

router.put(
  "/:projectId/collections/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.updateCollection.bind(collectionsController))
);

router.delete(
  "/:projectId/collections/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_DELETE],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.deleteCollection.bind(collectionsController))
);

router.post(
  "/:projectId/collections/:collectionName/validate-schema",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.validateCollectionSchema.bind(collectionsController))
);

// Collection statistics
router.get(
  "/:projectId/collections/:collectionName/statistics",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.getCollectionStatistics.bind(collectionsController))
);

// Document routes
router.post(
  "/:projectId/collections/:collectionName/documents",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.createDocument.bind(collectionsController))
);

router.get(
  "/:projectId/collections/:collectionName/documents",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.getDocuments.bind(collectionsController))
);

router.get(
  "/:projectId/collections/:collectionName/documents/count",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.countDocuments.bind(collectionsController))
);

router.post(
  "/:projectId/collections/:collectionName/documents/search",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.searchDocuments.bind(collectionsController))
);

// Bulk document operations - MUST come before single document routes
router.post(
  "/:projectId/collections/:collectionName/documents/bulk",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.bulkCreateDocuments.bind(collectionsController))
);

router.put(
  "/:projectId/collections/:collectionName/documents/bulk",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.bulkUpdateDocuments.bind(collectionsController))
);

router.post(
  "/:projectId/collections/:collectionName/documents/bulk-delete",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.bulkDeleteDocuments.bind(collectionsController))
);

// Document aggregation
router.post(
  "/:projectId/collections/:collectionName/aggregate",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.aggregateDocuments.bind(collectionsController))
);

// Single document operations - MUST come after bulk routes
router.get(
  "/:projectId/collections/:collectionName/documents/:documentId",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.getDocumentById.bind(collectionsController))
);

router.put(
  "/:projectId/collections/:collectionName/documents/:documentId",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.updateDocument.bind(collectionsController))
);

router.delete(
  "/:projectId/collections/:collectionName/documents/:documentId",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  asRequestHandler(collectionsController.deleteDocument.bind(collectionsController))
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

// Project user management routes
router.put(
  "/:projectId/users/:userId/enable",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId, userId } = req.params;
      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          error: "Project ID and User ID are required",
        });
      }
      const db = DatabaseService.getInstance();

      const success = await db.enableProjectUser(projectId, userId);
      if (success) {
        return res.json({
          success: true,
          message: "Project user enabled successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          error: "Project user not found",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to enable project user",
      });
    }
  }
);

router.put(
  "/:projectId/users/:userId/disable",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId, userId } = req.params;
      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          error: "Project ID and User ID are required",
        });
      }
      const db = DatabaseService.getInstance();

      const success = await db.disableProjectUser(projectId, userId);
      if (success) {
        return res.json({
          success: true,
          message: "Project user disabled successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          error: "Project user not found",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to disable project user",
      });
    }
  }
);

router.get(
  "/:projectId/users/:userId/status",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      const { projectId, userId } = req.params;
      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          error: "Project ID and User ID are required",
        });
      }
      const db = DatabaseService.getInstance();

      const status = await db.getProjectUserStatus(projectId, userId);
      if (status) {
        return res.json({
          success: true,
          data: status,
        });
      } else {
        return res.status(404).json({
          success: false,
          error: "Project user not found",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get project user status",
      });
    }
  }
);

export default router;
