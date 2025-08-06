import { Router, IRouter } from "express";
import { AdminController } from "@/controllers/admin.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

const router: IRouter = Router();
const controller = new AdminController();

// All routes require authentication
router.use(authenticate);

// Admin user management
router.get(
  "/users",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.getAllAdminUsers
);

router.get(
  "/users/:userId",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.getAdminUserById
);

router.post(
  "/users",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  controller.createAdminUser
);

router.put(
  "/users/:userId",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  controller.updateAdminUser
);

router.delete(
  "/users/:userId",
  requireScopes({
    scopes: [Scope.ADMIN_DELETE],
  }),
  controller.deleteAdminUser
);

// User API key management
router.get(
  "/users/:userId/api-keys",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.getUserApiKeys
);

router.post(
  "/users/:userId/api-keys",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  controller.createUserApiKey
);

// Master API key management
router.post(
  "/master-api-keys",
  requireScopes({
    scopes: [Scope.MASTER],
  }),
  controller.createMasterApiKey
);

router.delete(
  "/api-keys/:keyId",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  controller.deleteApiKey
);

// System management
router.get(
  "/system/stats",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.getSystemStats
);

// Database health check
router.get(
  "/system/db-health",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.getDatabaseHealth
);

// Database repair (master admin only)
router.post(
  "/system/db-repair",
  requireScopes({
    scopes: [Scope.MASTER],
  }),
  controller.repairDatabase
);

// System diagnostics
router.post(
  "/system/diagnostics",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.runDiagnostics
);

// Activity logs
router.get(
  "/activity",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.getActivityLogs
);

export default router;
