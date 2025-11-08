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
import { Router } from "express";

import SystemController from "../controllers/system.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const controller = SystemController;

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

export default router;
