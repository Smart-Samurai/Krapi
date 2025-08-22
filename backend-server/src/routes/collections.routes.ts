import { Router } from "express";
import { CollectionsController } from "../controllers/collections.controller";
import { requireScopes } from "../middleware/auth.middleware";
import { Scope } from "@krapi/sdk";

const router = Router();
const controller = new CollectionsController();

// Get all collections for a project
router.get(
  "/",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  controller.getAllCollections
);

// Get a specific collection by name
router.get(
  "/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_READ],
    projectSpecific: true,
  }),
  controller.getCollectionByName
);

// Create a new collection
router.post(
  "/",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  controller.createCollection
);

// Update a collection
router.put(
  "/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_WRITE],
    projectSpecific: true,
  }),
  controller.updateCollection
);

// Delete a collection
router.delete(
  "/:collectionName",
  requireScopes({
    scopes: [Scope.COLLECTIONS_DELETE],
    projectSpecific: true,
  }),
  controller.deleteCollection
);

export default router;
