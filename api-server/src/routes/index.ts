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
      admin: {
        getAllContent: "GET /api/admin/content",
        getContent: "GET /api/admin/content/:key",
        createContent: "POST /api/admin/content",
        updateContent: "PUT /api/admin/content/:key",
        deleteContent: "DELETE /api/admin/content/:key",
      },
      public: {
        getContent: "GET /api/content/:key",
      },
    },
  });
});

export default router;
