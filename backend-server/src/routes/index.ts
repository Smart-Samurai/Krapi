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

// ===== Project-Level Routes (SDK-driven) =====
// All project-specific resources will be created using existing SDK methods
router.use("/projects", enforceProjectOrigin, (req, res, next) => {
  if (!backendSDK) {
    return res
      .status(500)
      .json({ success: false, error: "BackendSDK not initialized" });
  }
  next();
});

// MCP integrated endpoints - will be implemented using existing SDK methods
router.use("/mcp", (req, res, next) => {
  if (!backendSDK) {
    return res
      .status(500)
      .json({ success: false, error: "BackendSDK not initialized" });
  }
  next();
});

// 404 handler
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

export default router;
