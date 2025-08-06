/**
 * Authentication Routes
 *
 * Handles all authentication-related endpoints for both admin and project users.
 * Base path: /krapi/k1/auth
 */

import { Router, IRouter } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "@/controllers/auth.controller";
import { authenticate } from "@/middleware/auth.middleware";

const router: IRouter = Router();
const controller = new AuthController();

// Rate limiting for sensitive operations
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 attempts per 15 minutes for sensitive operations
  message: "Too many attempts for this operation, please try again later.",
});

// Rate limiting for login attempts (more lenient)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per 15 minutes
  message: "Too many login attempts, please try again later.",
});

// ===== Admin Authentication =====
/**
 * Admin login with username/password
 * POST /krapi/k1/auth/admin/login
 * Body: { username: string, password: string }
 * Returns: { user, token, session_token, expires_at }
 */
router.post("/admin/login", loginLimiter, controller.adminLogin);

/**
 * Admin login with API key
 * POST /krapi/k1/auth/admin/api-login
 * Body: { api_key: string }
 * Returns: { user, token, session_token, expires_at }
 */
router.post("/admin/api-login", controller.adminApiLogin);

// ===== Session Management =====
/**
 * Create admin session from API key
 * POST /krapi/k1/auth/admin/session
 * Body: { api_key: string }
 * Returns: { session_token, expires_at, scopes }
 */
router.post("/admin/session", controller.createAdminSession);

/**
 * Create project-specific session
 * POST /krapi/k1/auth/project/:projectId/session
 * Body: { api_key: string }
 * Returns: { session_token, expires_at, scopes }
 */
router.post("/project/:projectId/session", controller.createProjectSession);

/**
 * Validate session token
 * POST /krapi/k1/auth/session/validate
 * Body: { token: string }
 * Returns: { valid: boolean, session?: Session }
 */
router.post("/session/validate", controller.validateSession);

// ===== Protected Routes (require authentication) =====
router.use(authenticate);

/**
 * Get current authenticated user
 * GET /krapi/k1/auth/me
 * Headers: Authorization: Bearer <token>
 * Returns: Current user data
 */
router.get("/me", controller.getCurrentUser);

/**
 * Logout and invalidate session
 * POST /krapi/k1/auth/logout
 * Headers: Authorization: Bearer <token>
 * Returns: Success message
 */
router.post("/logout", controller.logout);

/**
 * Change user password
 * POST /krapi/k1/auth/change-password
 * Headers: Authorization: Bearer <token>
 * Body: { current_password: string, new_password: string }
 * Returns: Success message
 */
router.post("/change-password", sensitiveLimiter, controller.changePassword);

/**
 * Regenerate API key for current user
 * POST /krapi/k1/auth/regenerate-api-key
 * Headers: Authorization: Bearer <token>
 * Returns: { api_key: string, message: string }
 */
router.post("/regenerate-api-key", controller.regenerateApiKey);

export default router;
