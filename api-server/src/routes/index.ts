import express, { Router } from "express";
import apiRoutes from "./api";

const router: express.Router = Router();

// API routes
router.use("/api", apiRoutes);

// Root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "API Server is running",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      auth: {
        login: "POST /api/auth/login",
        verify: "GET /api/auth/verify",
      },
      projects: {
        list: "GET /api/v2/admin/projects",
        create: "POST /api/v2/admin/projects",
        get: "GET /api/v2/admin/projects/:projectId",
        collections: "GET /api/v2/projects/:projectId/collections",
        documents: "GET /api/v2/projects/:projectId/collections/:collectionId/documents",
      },
    },
  });
});

export default router;
