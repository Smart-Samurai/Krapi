/**
 * Admin Routes
 *
 * Handles admin user management endpoints.
 * Base path: /krapi/k1/admin
 *
 * Routes:
 * - GET /users - Get all admin users
 * - GET /users/:userId - Get admin user by ID
 * - POST /users - Create admin user
 * - PUT /users/:userId - Update admin user
 * - DELETE /users/:userId - Delete admin user
 * - GET /users/:userId/api-keys - Get user API keys
 * - POST /users/:userId/api-keys - Create user API key
 * - POST /api-keys - Create admin API key
 * - POST /master-api-keys - Create master API key
 * - DELETE /api-keys/:keyId - Delete API key
 * - GET /system/stats - Get system statistics
 * - GET /system/db-health - Get database health
 * - POST /system/db-repair - Repair database
 * - POST /system/diagnostics - Run diagnostics
 * - PUT /users/:userId/enable - Enable admin account
 * - PUT /users/:userId/disable - Disable admin account
 * - GET /users/:userId/status - Get admin account status
 * - GET /activity - Get activity logs
 * - POST /activity/log - Log activity
 * - GET /activity/query - Query activity logs
 * - GET /activity/stats - Get activity statistics
 *
 * SDK-driven implementation using BackendSDK for all functionality.
 * All routes require authentication and admin scopes.
 *
 * @module routes/admin.routes
 */
import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { IRouter, Router } from "express";


// Admin handlers
import { CreateAdminApiKeyHandler } from "./handlers/admin/create-admin-api-key.handler";
import { CreateAdminUserHandler } from "./handlers/admin/create-admin-user.handler";
import { CreateMasterApiKeyHandler } from "./handlers/admin/create-master-api-key.handler";
import { CreateUserApiKeyHandler } from "./handlers/admin/create-user-api-key.handler";
import { DeleteAdminApiKeyHandler } from "./handlers/admin/delete-admin-api-key.handler";
import { DeleteAdminUserHandler } from "./handlers/admin/delete-admin-user.handler";
import { DisableAdminAccountHandler } from "./handlers/admin/disable-admin-account.handler";
import { EnableAdminAccountHandler } from "./handlers/admin/enable-admin-account.handler";
import { GetActivityLogsHandler } from "./handlers/admin/get-activity-logs.handler";
import { GetActivityStatsHandler } from "./handlers/admin/get-activity-stats.handler";
import { GetAdminAccountStatusHandler } from "./handlers/admin/get-admin-account-status.handler";
import { GetAdminUserHandler } from "./handlers/admin/get-admin-user.handler";
import { GetAdminUsersHandler } from "./handlers/admin/get-admin-users.handler";
import { GetDbHealthHandler } from "./handlers/admin/get-db-health.handler";
import { GetSystemStatsHandler } from "./handlers/admin/get-system-stats.handler";
import { GetUserApiKeysHandler } from "./handlers/admin/get-user-api-keys.handler";
import { LogActivityHandler } from "./handlers/admin/log-activity.handler";
import { QueryActivityHandler } from "./handlers/admin/query-activity.handler";
import { RepairDatabaseHandler } from "./handlers/admin/repair-database.handler";
import { RunDiagnosticsHandler } from "./handlers/admin/run-diagnostics.handler";
import { UpdateAdminUserHandler } from "./handlers/admin/update-admin-user.handler";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

const router: IRouter = Router();

// Initialize handlers
let getAdminUsersHandler: GetAdminUsersHandler;
let getAdminUserHandler: GetAdminUserHandler;
let createAdminUserHandler: CreateAdminUserHandler;
let updateAdminUserHandler: UpdateAdminUserHandler;
let deleteAdminUserHandler: DeleteAdminUserHandler;
let getUserApiKeysHandler: GetUserApiKeysHandler;
let createUserApiKeyHandler: CreateUserApiKeyHandler;
let createAdminApiKeyHandler: CreateAdminApiKeyHandler;
let createMasterApiKeyHandler: CreateMasterApiKeyHandler;
let deleteAdminApiKeyHandler: DeleteAdminApiKeyHandler;
let getSystemStatsHandler: GetSystemStatsHandler;
let getDbHealthHandler: GetDbHealthHandler;
let repairDatabaseHandler: RepairDatabaseHandler;
let runDiagnosticsHandler: RunDiagnosticsHandler;
let enableAdminAccountHandler: EnableAdminAccountHandler;
let disableAdminAccountHandler: DisableAdminAccountHandler;
let getAdminAccountStatusHandler: GetAdminAccountStatusHandler;
let getActivityLogsHandler: GetActivityLogsHandler;
let logActivityHandler: LogActivityHandler;
let queryActivityHandler: QueryActivityHandler;
let getActivityStatsHandler: GetActivityStatsHandler;

/**
 * Initialize BackendSDK for admin routes
 *
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeAdminSDK = (sdk: BackendSDK) => {
  // Initialize handlers
  getAdminUsersHandler = new GetAdminUsersHandler(sdk);
  getAdminUserHandler = new GetAdminUserHandler(sdk);
  createAdminUserHandler = new CreateAdminUserHandler(sdk);
  updateAdminUserHandler = new UpdateAdminUserHandler(sdk);
  deleteAdminUserHandler = new DeleteAdminUserHandler(sdk);
  getUserApiKeysHandler = new GetUserApiKeysHandler(sdk);
  createUserApiKeyHandler = new CreateUserApiKeyHandler(sdk);
  createAdminApiKeyHandler = new CreateAdminApiKeyHandler(sdk);
  createMasterApiKeyHandler = new CreateMasterApiKeyHandler(sdk);
  deleteAdminApiKeyHandler = new DeleteAdminApiKeyHandler(sdk);
  getSystemStatsHandler = new GetSystemStatsHandler(sdk);
  getDbHealthHandler = new GetDbHealthHandler(sdk);
  repairDatabaseHandler = new RepairDatabaseHandler(sdk);
  runDiagnosticsHandler = new RunDiagnosticsHandler(sdk);
  enableAdminAccountHandler = new EnableAdminAccountHandler(sdk);
  disableAdminAccountHandler = new DisableAdminAccountHandler(sdk);
  getAdminAccountStatusHandler = new GetAdminAccountStatusHandler(sdk);
  getActivityLogsHandler = new GetActivityLogsHandler(sdk);
  logActivityHandler = new LogActivityHandler(sdk);
  queryActivityHandler = new QueryActivityHandler(sdk);
  getActivityStatsHandler = new GetActivityStatsHandler(sdk);
};

// All routes require authentication
router.use(authenticate);

// Admin user management
router.get("/users", requireScopes({ scopes: [Scope.ADMIN_READ] }), async (req, res) => {
  await getAdminUsersHandler.handle(req, res);
});

router.get(
  "/users/:userId",
  requireScopes({ scopes: [Scope.ADMIN_READ] }),
  async (req, res) => {
    await getAdminUserHandler.handle(req, res);
  }
);

router.post("/users", requireScopes({ scopes: [Scope.ADMIN_WRITE] }), async (req, res) => {
  await createAdminUserHandler.handle(req, res);
});

router.put(
  "/users/:userId",
  requireScopes({ scopes: [Scope.ADMIN_WRITE] }),
  async (req, res) => {
    await updateAdminUserHandler.handle(req, res);
  }
);

router.delete(
  "/users/:userId",
  requireScopes({ scopes: [Scope.ADMIN_WRITE] }),
  async (req, res) => {
    await deleteAdminUserHandler.handle(req, res);
  }
);

// User API key management
router.get(
  "/users/:userId/api-keys",
  requireScopes({ scopes: [Scope.ADMIN_READ] }),
  async (req, res) => {
    await getUserApiKeysHandler.handle(req, res);
  }
);

router.post(
  "/users/:userId/api-keys",
  requireScopes({ scopes: [Scope.ADMIN_WRITE] }),
  async (req, res) => {
    await createUserApiKeyHandler.handle(req, res);
  }
);

// Admin API key management
router.post("/api-keys", requireScopes({ scopes: [Scope.ADMIN_WRITE] }), async (req, res) => {
  await createAdminApiKeyHandler.handle(req, res);
});

// Master API key management
router.post("/master-api-keys", requireScopes({ scopes: [Scope.MASTER] }), async (req, res) => {
  await createMasterApiKeyHandler.handle(req, res);
});

router.delete(
  "/api-keys/:keyId",
  requireScopes({ scopes: [Scope.ADMIN_WRITE] }),
  async (req, res) => {
    await deleteAdminApiKeyHandler.handle(req, res);
  }
);

// System management
router.get("/system/stats", requireScopes({ scopes: [Scope.ADMIN_READ] }), async (req, res) => {
  await getSystemStatsHandler.handle(req, res);
});

// Database health check
router.get(
  "/system/db-health",
  requireScopes({ scopes: [Scope.ADMIN_READ] }),
  async (req, res) => {
    await getDbHealthHandler.handle(req, res);
  }
);

// Database repair (master admin only)
router.post("/system/db-repair", requireScopes({ scopes: [Scope.MASTER] }), async (req, res) => {
  await repairDatabaseHandler.handle(req, res);
});

// System diagnostics
router.post(
  "/system/diagnostics",
  requireScopes({ scopes: [Scope.ADMIN_READ] }),
  async (req, res) => {
    await runDiagnosticsHandler.handle(req, res);
  }
);

// Admin account management routes
router.put(
  "/users/:userId/enable",
  requireScopes({ scopes: [Scope.ADMIN_WRITE] }),
  async (req, res) => {
    await enableAdminAccountHandler.handle(req, res);
  }
);

router.put(
  "/users/:userId/disable",
  requireScopes({ scopes: [Scope.ADMIN_WRITE] }),
  async (req, res) => {
    await disableAdminAccountHandler.handle(req, res);
  }
);

router.get(
  "/users/:userId/status",
  requireScopes({ scopes: [Scope.ADMIN_READ] }),
  async (req, res) => {
    await getAdminAccountStatusHandler.handle(req, res);
  }
);

// Activity logs
router.get("/activity", requireScopes({ scopes: [Scope.ADMIN_READ] }), async (req, res) => {
  await getActivityLogsHandler.handle(req, res);
});

// Activity logging
router.post("/activity/log", requireScopes({ scopes: [Scope.ADMIN_WRITE] }), async (req, res) => {
  await logActivityHandler.handle(req, res);
});

// Activity query
router.get(
  "/activity/query",
  requireScopes({ scopes: [Scope.ADMIN_READ] }),
  async (req, res) => {
    await queryActivityHandler.handle(req, res);
  }
);

// Activity statistics
router.get(
  "/activity/stats",
  requireScopes({ scopes: [Scope.ADMIN_READ] }),
  async (req, res) => {
    await getActivityStatsHandler.handle(req, res);
  }
);

export default router;
