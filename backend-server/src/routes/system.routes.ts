import { Router } from "express";

import SystemController from "../controllers/system.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const controller = SystemController;

// Apply authentication middleware to all system routes
router.use(authenticate);

/**
 * System Settings
 * GET /krapi/k1/system/settings - Get system settings
 * PUT /krapi/k1/system/settings - Update system settings
 */
router.get("/settings", controller.getSettings);
router.put("/settings", controller.updateSettings);

/**
 * Email Configuration Testing
 * POST /krapi/k1/system/test-email - Test email configuration
 */
router.post("/test-email", controller.testEmailConfig);

/**
 * System Information
 * GET /krapi/k1/system/info - Get system information
 */
router.get("/info", controller.getSystemInfo);

/**
 * Database Health
 * GET /krapi/k1/system/database-health - Get database health status
 */
router.get("/database-health", controller.getDatabaseHealth);

export default router;
