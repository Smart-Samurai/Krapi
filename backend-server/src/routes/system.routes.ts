/**
 * System Routes
 * 
 * Handles system-level endpoints including settings, health checks, and system information.
 * Base path: /krapi/k1/system
 * 
 * All routes require authentication.
 * 
 * @module routes/system.routes
 */
import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Router } from "express";

import SystemController from "../controllers/system.controller";
import { authenticate, requireScopes } from "../middleware/auth.middleware";
import { EncryptionKeyHandler } from "../routes/handlers/system/encryption-key.handler";
import { Scope } from "../types";

const router: Router = Router();
const controller = SystemController;
let encryptionKeyHandler: EncryptionKeyHandler | null = null;

/**
 * Initialize BackendSDK for system routes
 * 
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeSystemSDK = (sdk: BackendSDK) => {
  controller.setBackendSDK(sdk);
  encryptionKeyHandler = new EncryptionKeyHandler(sdk);
};

// Apply authentication middleware to all system routes
router.use(authenticate);

/**
 * Get system settings
 * 
 * GET /krapi/k1/system/settings
 * 
 * Retrieves current system settings.
 * 
 * @route GET /settings
 * @returns {Object} System settings
 */
router.get("/settings", controller.getSettings);

/**
 * Update system settings
 * 
 * PUT /krapi/k1/system/settings
 * 
 * Updates system settings.
 * 
 * @route PUT /settings
 * @body {SystemSettings} settings - Settings updates
 * @returns {Object} Updated system settings
 */
router.put("/settings", controller.updateSettings);

/**
 * Test email configuration
 * 
 * POST /krapi/k1/system/test-email
 * 
 * Tests the email configuration by sending a test email.
 * 
 * @route POST /test-email
 * @body {string} email - Email address to send test email to
 * @returns {Object} Test result
 */
router.post("/test-email", controller.testEmailConfig);

/**
 * Get system information
 * 
 * GET /krapi/k1/system/info
 * 
 * Retrieves system information including version, environment, etc.
 * 
 * @route GET /info
 * @returns {Object} System information
 */
router.get("/info", controller.getSystemInfo);

/**
 * Get database health status
 * 
 * GET /krapi/k1/system/database-health
 * 
 * Retrieves database health status and diagnostics.
 * 
 * @route GET /database-health
 * @returns {Object} Database health status
 */
router.get("/database-health", controller.getDatabaseHealth);

/**
 * Reset all database data (hard reset)
 * 
 * POST /krapi/k1/system/reset-database
 * 
 * WARNING: This is a destructive operation that will delete ALL data.
 * Requires MASTER scope or ADMIN_DELETE scope.
 * 
 * @route POST /reset-database
 * @returns {Object} Reset statistics
 */
router.post("/reset-database", requireScopes({ scopes: ["MASTER", "admin:delete"] }), controller.resetDatabase);

/**
 * Get file encryption key
 * 
 * GET /krapi/k1/system/encryption-key
 * 
 * Retrieves the file encryption key. Only accessible to admins.
 * Requires admin:read or MASTER scope.
 * 
 * @route GET /encryption-key
 * @returns {Object} Encryption key information
 */
router.get(
  "/encryption-key",
  requireScopes({ scopes: [Scope.ADMIN_READ, "MASTER"] }),
  async (req, res) => {
    if (!encryptionKeyHandler) {
      res.status(500).json({
        success: false,
        error: "Encryption key handler not initialized",
      });
      return;
    }
    await encryptionKeyHandler.handle(req, res);
  }
);

export default router;
