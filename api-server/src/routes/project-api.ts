import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import ProjectApiController from "../controllers/project-api";

const router: express.Router = express.Router();

// Public routes
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Project API is healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Public authentication routes
router.post("/auth/login", ProjectApiController.authenticateUser);
router.post("/auth/verify", ProjectApiController.authenticateApiKey);

// Admin routes (require admin authentication)
router.use(authenticateToken);
router.use(requireRole(["admin"]));

// Project management (admin only)
router.get("/admin/projects", ProjectApiController.getProjects);
router.get("/admin/projects/:projectId", ProjectApiController.getProject);
router.post("/admin/projects", ProjectApiController.createProject);

// Admin API key management (admin only)
router.get("/admin/projects/:projectId/keys", ProjectApiController.getApiKeys);
router.post(
  "/admin/projects/:projectId/keys",
  ProjectApiController.createApiKey
);
router.delete(
  "/admin/projects/:projectId/keys/:keyId",
  ProjectApiController.deleteApiKey
);

// Unified API endpoint (Appwrite-style)
// This allows clients to access data using a single endpoint with the API key
router.get(
  "/databases/:databaseId/collections/:collectionId/documents",
  ProjectApiController.getDocuments
);
router.post(
  "/databases/:databaseId/collections/:collectionId/documents",
  ProjectApiController.createDocument
);
router.get(
  "/databases/:databaseId/collections/:collectionId/documents/:documentId",
  ProjectApiController.getDocument
);
router.put(
  "/databases/:databaseId/collections/:collectionId/documents/:documentId",
  ProjectApiController.updateDocument
);
router.delete(
  "/databases/:databaseId/collections/:collectionId/documents/:documentId",
  ProjectApiController.deleteDocument
);

// Account management
router.get("/account", (req, res) => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({
      success: false,
      error: "User not authenticated",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: user.user_id,
      email: user.email,
      project_id: user.project_id,
    },
  });
});

export default router;
