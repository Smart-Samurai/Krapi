import express from "express";
import ProjectApiController from "../controllers/project-api";

const router: express.Router = express.Router();

const authenticateProjectApi = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    console.log("🔍 authenticateProjectApi called for:", req.path);
    console.log("🔍 Headers:", req.headers);

    const apiKey = req.headers["x-api-key"] as string;
    if (!apiKey) {
      console.log("❌ No API key found in headers");
      res.status(401).json({
        success: false,
        error: "API key required",
      });
      return;
    }

    // Import here to avoid circular dependency
    const projectDatabase = require("../services/project-database").default;
    const keyData = projectDatabase.getProjectApiKeyByKey(apiKey);

    if (!keyData || keyData.status !== "active") {
      res.status(401).json({
        success: false,
        error: "Invalid or inactive API key",
      });
      return;
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      res.status(401).json({
        success: false,
        error: "API key has expired",
      });
      return;
    }

    // Update last used timestamp
    projectDatabase.updateProjectApiKey(keyData.id, {
      last_used: new Date().toISOString(),
    });

    // Add project context to request
    (req as any).projectId = keyData.project_id;
    (req as any).apiKey = keyData;

    next();
  } catch (error) {
    console.error("Project API authentication error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

// Apply authentication middleware to all routes
router.use(authenticateProjectApi);

// Collections
router.get("/collections", ProjectApiController.getCollections);
router.post("/collections", ProjectApiController.createCollection);
router.get("/collections/:collectionId", ProjectApiController.getCollection);
router.put("/collections/:collectionId", ProjectApiController.updateCollection);
router.delete(
  "/collections/:collectionId",
  ProjectApiController.deleteCollection
);

// Documents
router.get(
  "/collections/:collectionId/documents",
  ProjectApiController.getDocuments
);
router.post(
  "/collections/:collectionId/documents",
  ProjectApiController.createDocument
);
router.get(
  "/collections/:collectionId/documents/:documentId",
  ProjectApiController.getDocument
);
router.put(
  "/collections/:collectionId/documents/:documentId",
  ProjectApiController.updateDocument
);
router.delete(
  "/collections/:collectionId/documents/:documentId",
  ProjectApiController.deleteDocument
);

// Users
router.get("/users", ProjectApiController.getUsers);
router.post("/users", ProjectApiController.createUser);
router.get("/users/:userId", ProjectApiController.getUser);
router.put("/users/:userId", ProjectApiController.updateUser);
router.delete("/users/:userId", ProjectApiController.deleteUser);

// API Keys
router.get("/keys", ProjectApiController.getApiKeys);
router.post("/keys", ProjectApiController.createApiKey);
router.delete("/keys/:keyId", ProjectApiController.deleteApiKey);

// Stats
router.get("/stats", ProjectApiController.getProjectStats);

export default router;
