/**
 * Main Router Configuration
 *
 * This file defines the complete API route structure for KRAPI backend.
 * All routes are prefixed with /krapi/k1 (configured in app.ts).
 *
 * Route Structure:
 * - System Routes: Health checks, version info
 * - Admin Routes: Authentication, admin user management
 * - Project Routes: Project CRUD operations
 * - Project Resource Routes: Collections, storage, users (nested under projects)
 */

import { Router, Router as RouterType } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import projectRoutes from "./project.routes";
import collectionsRoutes from "./collections.routes";
import storageRoutes from "./storage.routes";
import usersRoutes from "./users.routes";
import emailRoutes from "./email.routes";
import apiKeysRoutes from "./api-keys.routes";
import changelogRoutes from "./changelog.routes";
import testingRoutes from "./testing.routes";
import { DatabaseService } from "@/services/database.service";

const router: RouterType = Router();

// ===== System Routes =====
/**
 * Health check endpoint
 * GET /krapi/k1/health
 *
 * Returns system health status including database connectivity.
 * No authentication required.
 *
 * @returns {Object} Health status with version, timestamp, and database info
 */
router.get("/health", async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
    const dbHealth = await db.performHealthCheck();

    res.json({
      success: true,
      message: "KRAPI Backend is running",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      database: dbHealth,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Database repair endpoint (protected - should be admin only in production)
router.post("/health/repair", async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
    const repairResult = await db.repairDatabase();

    res.json({
      success: repairResult.success,
      message: repairResult.success
        ? "Database repair completed"
        : "Database repair failed",
      actions: repairResult.actions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database repair failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// API version info
router.get("/version", (req, res) => {
  res.json({
    success: true,
    data: {
      version: "2.0.0",
      api: "KRAPI",
      documentation: "/docs",
    },
  });
});

// ===== Admin-Level Routes =====
// Authentication routes for admin users
router.use("/auth", authRoutes);

// Admin management routes (users, system settings)
router.use("/admin", adminRoutes);

// Project management routes (CRUD operations on projects)
router.use("/projects", projectRoutes);

// Testing routes (only in development mode)
if (process.env.NODE_ENV !== "production") {
  router.use("/testing", testingRoutes);
}

// ===== Project-Level Routes =====
// All project-specific resources are nested under /projects/:projectId
router.use("/projects", collectionsRoutes); // /projects/:projectId/collections
router.use("/projects", storageRoutes); // /projects/:projectId/storage
router.use("/projects", usersRoutes); // /projects/:projectId/users
router.use("/projects", emailRoutes); // /projects/:projectId/email
router.use("/projects", apiKeysRoutes); // /projects/:projectId/api-keys
router.use("/projects", changelogRoutes); // /projects/:projectId/changelog

// Future project-level routes will follow the same pattern:
// router.use('/projects', functionsRoutes); // /projects/:projectId/functions

// 404 handler
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

export default router;
