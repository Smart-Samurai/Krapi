/**
 * Authentication Routes
 *
 * Handles all authentication-related endpoints for both admin and project users.
 * Base path: /krapi/k1/auth
 *
 * Routes:
 * - POST /admin/login - Admin login with username/password
 * - POST /admin/api-login - Admin login with API key
 * - POST /admin/session - Create admin session from API key
 * - POST /project/:projectId/session - Create project session
 * - POST /session/validate - Validate session token
 * - POST /refresh - Refresh session token
 * - POST /logout - Logout and invalidate session
 * - POST /change-password - Change user password
 *
 * @module routes/auth.routes
 * @example
 * // Routes are automatically registered when imported
 * import authRoutes from './auth.routes';
 * app.use('/krapi/k1/auth', authRoutes);
 */

import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Router, IRouter } from "express";
import { rateLimit } from "express-rate-limit";

import { AuthController } from "@/controllers/auth.controller";
import { authenticate } from "@/middleware/auth.middleware";

const router: IRouter = Router();
const controller = new AuthController();

/**
 * Initialize BackendSDK for auth routes
 *
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeAuthSDK = (sdk: BackendSDK) => {
  controller.setBackendSDK(sdk);
};

// Rate limiting configuration from environment variables
// Disable rate limiting in test mode, development mode, or when explicitly disabled
const RATE_LIMIT_DISABLED =
  process.env.DISABLE_RATE_LIMIT === "true" ||
  process.env.NODE_ENV === "test" ||
  process.env.NODE_ENV === "development";
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "900000"
); // 15 minutes default
const SENSITIVE_RATE_LIMIT_MAX = parseInt(
  process.env.SENSITIVE_RATE_LIMIT_MAX || "10"
);
const LOGIN_RATE_LIMIT_MAX = parseInt(
  process.env.LOGIN_RATE_LIMIT_MAX || (RATE_LIMIT_DISABLED ? "999999" : "50")
);

// Rate limiting for sensitive operations
const sensitiveLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: SENSITIVE_RATE_LIMIT_MAX,
  message: "Too many attempts for this operation, please try again later.",
  skip: () => RATE_LIMIT_DISABLED, // Skip rate limiting if disabled
});

// Rate limiting for login attempts (more lenient)
const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: LOGIN_RATE_LIMIT_MAX,
  message: "Too many login attempts, please try again later.",
  skip: () => RATE_LIMIT_DISABLED, // Skip rate limiting if disabled
});

// ===== Unified Login (Admin or Project User) =====
/**
 * Unified login with username/password
 *
 * POST /krapi/k1/auth/login
 *
 * Authenticates either an admin user or project user with username and password.
 * Tries admin authentication first, then project user authentication.
 * Rate limited to prevent brute force attacks.
 *
 * @route POST /login
 * @body {string} username - Username (admin or project user)
 * @body {string} password - Password
 * @body {boolean} [remember_me] - Optional remember me flag
 * @returns {Object} Authentication result with user, token, session_token, expires_at, scopes
 */
router.post("/login", loginLimiter, controller.login);

// ===== Admin Authentication =====
/**
 * Admin login with username/password
 *
 * POST /krapi/k1/auth/admin/login
 *
 * Authenticates an admin user with username and password.
 * Rate limited to prevent brute force attacks.
 *
 * @route POST /admin/login
 * @body {string} username - Admin username
 * @body {string} password - Admin password
 * @returns {Object} Authentication result with user, token, session_token, expires_at
 */
router.post("/admin/login", loginLimiter, controller.adminLogin);

/**
 * Admin login with API key
 *
 * POST /krapi/k1/auth/admin/api-login
 *
 * Authenticates an admin user using an API key.
 *
 * @route POST /admin/api-login
 * @body {string} api_key - Admin API key
 * @returns {Object} Authentication result with user, token, session_token, expires_at
 */
router.post("/admin/api-login", controller.adminApiLogin);

/**
 * User registration
 *
 * POST /krapi/k1/auth/register
 *
 * Registers a new user account.
 * Rate limited to prevent abuse.
 *
 * @route POST /register
 * @body {string} username - Username
 * @body {string} email - Email address
 * @body {string} password - Password
 * @body {string} [role] - Optional role
 * @body {string} [access_level] - Optional access level
 * @body {string[]} [permissions] - Optional permissions array
 * @returns {Object} Registration result with success flag and user data
 */
router.post("/register", loginLimiter, controller.register);

// ===== Session Management =====
/**
 * Create admin session from API key
 *
 * POST /krapi/k1/auth/admin/session
 *
 * Creates a new admin session from an API key.
 *
 * @route POST /admin/session
 * @body {string} api_key - Admin API key
 * @returns {Object} Session data with session_token, expires_at, scopes
 */
router.post("/admin/session", controller.createAdminSession);

/**
 * Create project-specific session
 *
 * POST /krapi/k1/auth/project/:projectId/session
 *
 * Creates a new project session from an API key.
 *
 * @route POST /project/:projectId/session
 * @param {string} projectId - Project ID
 * @body {string} api_key - Project API key
 * @returns {Object} Session data with session_token, expires_at, scopes
 */
router.post("/project/:projectId/session", controller.createProjectSession);

/**
 * Validate session token
 *
 * POST /krapi/k1/auth/session/validate
 *
 * Validates a session token and returns session information if valid.
 *
 * @route POST /session/validate
 * @body {string} token - Session token to validate
 * @returns {Object} Validation result with valid flag and optional session data
 */
router.post("/session/validate", controller.validateSession);

/**
 * Refresh session token
 *
 * POST /krapi/k1/auth/refresh
 *
 * Refreshes an existing session token, extending its expiration.
 * Requires authentication.
 *
 * @route POST /refresh
 * @header Authorization: Bearer <token>
 * @returns {Object} New session data with session_token, expires_at, scopes
 */
router.post("/refresh", authenticate, controller.refreshSession);

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
