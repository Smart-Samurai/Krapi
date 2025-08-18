/**
 * Main Router Configuration
 *
 * This file defines the complete API route structure for KRAPI backend.
 * All routes are prefixed with /krapi/k1 (configured in app.ts).
 *
 * CRITICAL: This backend now uses the SDK-driven architecture.
 * All functionality comes from the SDK - backend just wires it up.
 */

import { BackendSDK } from "@krapi/sdk";
import { Router, Router as RouterType } from "express";

import { authenticate as _authenticate } from "@/middleware/auth.middleware";
import { enforceProjectOrigin } from "@/middleware/origin-guard.middleware";
import systemRoutes from "./system.routes";
import adminRoutes, { initializeAdminSDK } from "./admin.routes";
import emailRoutes, { initializeEmailSDK } from "./email.routes";
import authRoutes from "./auth.routes";
import projectRoutes from "./project.routes";
import collectionsRoutes from "./collections.routes";
import usersRoutes from "./users.routes";
import apiKeysRoutes from "./api-keys.routes";
import storageRoutes from "./storage.routes";
import testingRoutes from "./testing.routes";
import changelogRoutes from "./changelog.routes";

const router: RouterType = Router();

// Initialize the BackendSDK with database connection
// This will be properly configured in app.ts
let backendSDK: BackendSDK;

// Initialize SDK function - called from app.ts
export const initializeBackendSDK = (sdk: BackendSDK) => {
  backendSDK = sdk;
  // Initialize route-specific SDK instances
  initializeAdminSDK(sdk);
  initializeEmailSDK(sdk);
};

// ===== System Routes (SDK-driven) =====
/**
 * Health check endpoint - uses SDK health management
 * GET /krapi/k1/health
 */
router.get("/health", async (req, res) => {
  try {
    if (!backendSDK) {
      throw new Error("BackendSDK not initialized");
    }

    const health = await backendSDK.performHealthCheck();

    res.json({
      success: true,
      message: "KRAPI Backend is running",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      database: health,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Database repair endpoint - uses SDK auto-fixing
 * POST /krapi/k1/health/repair
 */
router.post("/health/repair", async (req, res) => {
  try {
    if (!backendSDK) {
      throw new Error("BackendSDK not initialized");
    }

    const repairResult = await backendSDK.autoFixDatabase();

    res.json({
      success: repairResult.success,
      message:
        "message" in repairResult
          ? repairResult.message
          : "Database repair completed",
      actions: repairResult,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database repair failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * API version info
 * GET /krapi/k1/version
 */
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

// ===== System Management Routes =====
router.use("/system", systemRoutes);

// ===== Admin-Level Routes (SDK-driven) =====
router.use("/admin", adminRoutes);

// ===== Email Routes (SDK-driven) =====
router.use("/email", emailRoutes);

// ===== Authentication Routes (SDK-driven) =====
router.use("/auth", authRoutes);

// ===== Project-Level Routes (SDK-driven) =====
router.use("/projects", enforceProjectOrigin, projectRoutes);

// ===== Collection-Level Routes (SDK-driven) =====
router.use("/collections", enforceProjectOrigin, collectionsRoutes);

// ===== User Management Routes (SDK-driven) =====
router.use("/users", enforceProjectOrigin, usersRoutes);

// ===== API Keys Routes (SDK-driven) =====
router.use("/api-keys", enforceProjectOrigin, apiKeysRoutes);

// ===== Storage Routes (SDK-driven) =====
router.use("/storage", enforceProjectOrigin, storageRoutes);

// ===== Testing Routes (SDK-driven) =====
router.use("/testing", testingRoutes);

// ===== Changelog Routes (SDK-driven) =====
router.use("/changelog", enforceProjectOrigin, changelogRoutes);

// 404 handler
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

export default router;
