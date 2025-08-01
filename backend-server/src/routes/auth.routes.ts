import { Router, IRouter } from "express";
import { AuthController } from "@/controllers/auth.controller";
import { authenticate } from "@/middleware/auth.middleware";

const router: IRouter = Router();
const controller = new AuthController();

// ===== Admin Authentication =====
// Login with username/password
router.post("/admin/login", controller.adminLogin);

// Login with API key
router.post("/admin/api-login", controller.adminApiLogin);

// ===== Session Management =====
// Create admin session (for API access)
router.post("/admin/session", controller.createAdminSession);

// Create project session (for project-specific access)
router.post("/project/:projectId/session", controller.createProjectSession);

// Validate any session
router.post("/session/validate", controller.validateSession);

// ===== Protected Routes (require authentication) =====
router.use(authenticate);

// Get current authenticated user
router.get("/me", controller.getCurrentUser);

// Logout (invalidate session)
router.post("/logout", controller.logout);

// Change password
router.post("/change-password", controller.changePassword);

// Regenerate API key for current user
router.post("/regenerate-api-key", controller.regenerateApiKey);

export default router;
