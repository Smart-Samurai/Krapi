import { Router, IRouter } from "express";

import { CollectionsController } from "@/controllers/collections.controller";
import {
  authenticate,
  requireCollectionRead,
  requireCollectionWrite,
  requireDocumentRead,
  requireDocumentWrite,
  requireScopes,
} from "@/middleware/auth.middleware";
import { Scope } from "@/types";

const router: IRouter = Router();
const controller = new CollectionsController();

// All routes require authentication
router.use(authenticate);

// Collection routes
router.get(
  "/:projectId/collections",
  requireCollectionRead,
  controller.getCollections
);
router.get(
  "/:projectId/collections/:collectionName",
  requireCollectionRead,
  controller.getCollection
);
router.post(
  "/:projectId/collections",
  requireCollectionWrite,
  controller.createCollection
);
router.put(
  "/:projectId/collections/:collectionName",
  requireCollectionWrite,
  controller.updateCollection
);
router.delete(
  "/:projectId/collections/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_DELETE],
    projectSpecific: true,
  }),
  controller.deleteCollection
);

// Document routes
router.get(
  "/:projectId/collections/:collectionName/documents",
  requireDocumentRead,
  controller.getDocuments
);
router.get(
  "/:projectId/collections/:collectionName/documents/:documentId",
  requireDocumentRead,
  controller.getDocument
);
router.post(
  "/:projectId/collections/:collectionName/documents",
  requireDocumentWrite,
  controller.createDocument
);
router.put(
  "/:projectId/collections/:collectionName/documents/:documentId",
  requireDocumentWrite,
  controller.updateDocument
);
router.delete(
  "/:projectId/collections/:collectionName/documents/:documentId",
  requireScopes({
    scopes: [Scope.DOCUMENTS_DELETE],
    projectSpecific: true,
  }),
  controller.deleteDocument
);

// Batch operations (require write permissions)
router.post(
  "/:projectId/collections/:collectionName/documents/batch",
  requireDocumentWrite,
  controller.batchCreateDocuments
);
router.put(
  "/:projectId/collections/:collectionName/documents/batch",
  requireDocumentWrite,
  controller.batchUpdateDocuments
);
router.delete(
  "/:projectId/collections/:collectionName/documents/batch",
  requireScopes({
    scopes: [Scope.DOCUMENTS_DELETE],
    projectSpecific: true,
  }),
  controller.batchDeleteDocuments
);

export default router;
