/**
 * Main Router Configuration
 *
 * Defines the complete API route structure for KRAPI backend.
 * All routes are prefixed with /krapi/k1 (configured in app.ts).
 *
 * CRITICAL: This backend uses the SDK-driven architecture.
 * All functionality comes from the SDK - backend just wires it up.
 *
 * Route Structure:
 * - /krapi/k1/auth/* - Authentication endpoints
 * - /krapi/k1/admin/* - Admin user management
 * - /krapi/k1/projects/* - Project CRUD operations
 * - /krapi/k1/projects/:projectId/collections/* - Collection operations
 * - /krapi/k1/projects/:projectId/storage/* - File storage operations
 * - /krapi/k1/projects/:projectId/users/* - Project user management
 * - /krapi/k1/projects/:projectId/email/* - Email operations
 * - /krapi/k1/system/* - System settings and health
 * - /krapi/k1/health/* - Health check endpoints
 *
 * This routes file now delegates to specialized handlers for core operations.
 * Additional handlers can be created incrementally for remaining routes.
 *
 * @module routes/index
 * @example
 * // Routes are automatically registered when this module is imported
 * import routes from './routes';
 * app.use('/krapi/k1', routes);
 */

import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response, Router, Router as RouterType } from "express";

import mcpRouter from "../mcp/router";
import { enforceProjectOrigin } from "../middleware/origin-guard.middleware";

// Import route modules
import adminRoutes, { initializeAdminSDK } from "./admin.routes";
import apiKeysRoutes, { initializeApiKeysSDK } from "./api-keys.routes";
import authRoutes, { initializeAuthSDK } from "./auth.routes";
import backupRoutes, { initializeBackupSDK } from "./backup.routes";
import changelogRoutes, { initializeChangelogSDK } from "./changelog.routes";
import collectionsRoutes, {
  initializeCollectionsSDK,
} from "./collections.routes";
import emailRoutes, { initializeEmailSDK } from "./email.routes";
import { ActivityCleanupHandler } from "./handlers/activity/cleanup.handler";
import { QueryActivityHandler } from "./handlers/activity/query-activity.handler";
import { RecentActivityHandler } from "./handlers/activity/recent.handler";
import { ActivityStatsHandler } from "./handlers/activity/stats.handler";
import { UserTimelineHandler } from "./handlers/activity/user-timeline.handler";
import { ValidateKeyHandler } from "./handlers/auth/validate-key.handler";
import { CreateDefaultAdminHandler } from "./handlers/database/create-default-admin.handler";
import { InitializeDatabaseHandler } from "./handlers/database/initialize.handler";
import { AutoFixHandler } from "./handlers/health/auto-fix.handler";
import { DatabaseHealthHandler } from "./handlers/health/database-health.handler";
import { HealthDiagnosticsHandler } from "./handlers/health/diagnostics.handler";
import { MigrateHandler } from "./handlers/health/migrate.handler";
import { RepairHandler } from "./handlers/health/repair.handler";
import { HealthStatsHandler } from "./handlers/health/stats.handler";
import { ValidateSchemaHandler } from "./handlers/health/validate-schema.handler";
import { QueueMetricsHandler } from "./handlers/queue/metrics.handler";
import { HealthCheckHandler } from "./handlers/system/health-check.handler";
import { SystemInfoHandler } from "./handlers/system/info.handler";
import { SystemSettingsHandler } from "./handlers/system/settings.handler";
import { SystemStatusHandler } from "./handlers/system/status.handler";
import { GetUserActivityHandler } from "./handlers/users/get-activity.handler";
import projectRoutes, { initializeProjectSDK } from "./project.routes";
import storageRoutes, { initializeStorageSDK } from "./storage.routes";
import systemRoutes, { initializeSystemSDK } from "./system.routes";
import testingRoutes from "./testing.routes";
import usersRoutes, { initializeUsersSDK } from "./users.routes";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { ExtendedRequest } from "@/types";
import { Scope } from "@/types";

// Import handlers

const router: RouterType = Router();

// BackendSDK is initialized via initializeBackendSDK() and used by handlers directly
// Note: The SDK instance is stored in the handlers, not at module level

// Initialize handlers
let activityCleanupHandler: ActivityCleanupHandler;
let queryActivityHandler: QueryActivityHandler;
let recentActivityHandler: RecentActivityHandler;
let activityStatsHandler: ActivityStatsHandler;
let userTimelineHandler: UserTimelineHandler;
let autoFixHandler: AutoFixHandler;
let databaseHealthHandler: DatabaseHealthHandler;
let healthDiagnosticsHandler: HealthDiagnosticsHandler;
let healthStatsHandler: HealthStatsHandler;
let healthCheckHandler: HealthCheckHandler;
let migrateHandler: MigrateHandler;
let repairHandler: RepairHandler;
let systemStatusHandler: SystemStatusHandler;
let systemSettingsHandler: SystemSettingsHandler;
let systemInfoHandler: SystemInfoHandler;
let queueMetricsHandler: QueueMetricsHandler;
let validateSchemaHandler: ValidateSchemaHandler;
let createDefaultAdminHandler: CreateDefaultAdminHandler;
let initializeDatabaseHandler: InitializeDatabaseHandler;
let validateKeyHandler: ValidateKeyHandler;
let getUserActivityHandler: GetUserActivityHandler;

/**
 * Initialize BackendSDK for all routes
 *
 * Called from app.ts to set up the BackendSDK instance for all route handlers.
 * Initializes route-specific SDK instances and handlers.
 *
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 *
 * @example
 * initializeBackendSDK(backendSDK);
 * // All routes now have access to the SDK
 */
export const initializeBackendSDK = (sdk: BackendSDK) => {
  // SDK passed to handlers directly, no module-level storage needed

  // Initialize handlers
  activityCleanupHandler = new ActivityCleanupHandler(sdk);
  queryActivityHandler = new QueryActivityHandler(sdk);
  recentActivityHandler = new RecentActivityHandler(sdk);
  activityStatsHandler = new ActivityStatsHandler(sdk);
  userTimelineHandler = new UserTimelineHandler(sdk);
  autoFixHandler = new AutoFixHandler(sdk);
  databaseHealthHandler = new DatabaseHealthHandler();
  healthDiagnosticsHandler = new HealthDiagnosticsHandler(sdk);
  healthStatsHandler = new HealthStatsHandler(sdk);
  healthCheckHandler = new HealthCheckHandler();
  migrateHandler = new MigrateHandler(sdk);
  repairHandler = new RepairHandler(sdk);
  systemStatusHandler = new SystemStatusHandler(sdk);
  systemSettingsHandler = new SystemSettingsHandler(sdk);
  systemInfoHandler = new SystemInfoHandler(sdk);
  queueMetricsHandler = new QueueMetricsHandler(sdk);
  validateSchemaHandler = new ValidateSchemaHandler(sdk);
  createDefaultAdminHandler = new CreateDefaultAdminHandler(sdk);
  initializeDatabaseHandler = new InitializeDatabaseHandler(sdk);
  validateKeyHandler = new ValidateKeyHandler(sdk);
  getUserActivityHandler = new GetUserActivityHandler(sdk);

  // Initialize route-specific SDK instances
  initializeAdminSDK(sdk);
  initializeApiKeysSDK(sdk);
  initializeCollectionsSDK(sdk);
  initializeEmailSDK(sdk);
  initializeProjectSDK(sdk);
  initializeBackupSDK(sdk);
  initializeChangelogSDK(sdk);
  initializeStorageSDK(sdk);
  initializeAuthSDK(sdk);
  initializeUsersSDK(sdk);
  initializeSystemSDK(sdk);
  // Testing controller uses regular SDK (client mode), not BackendSDK
  // No initialization needed - it connects via HTTP to frontend proxy
};

// ===== Health Routes =====
/**
 * Basic health check endpoint
 *
 * GET /krapi/k1/health
 *
 * Returns basic server health status.
 */
router.get("/health", async (req, res) => {
  await healthCheckHandler.handle(req, res);
});

/**
 * Database health check endpoint (SDK-compatible)
 *
 * GET /krapi/k1/health/database
 *
 * Returns database health status.
 */
router.get("/health/database", async (req, res) => {
  await databaseHealthHandler.handle(req, res);
});

/**
 * Health diagnostics endpoint (SDK-compatible)
 *
 * POST /krapi/k1/health/diagnostics
 *
 * Runs comprehensive health diagnostics including database, system, and services.
 */
router.post("/health/diagnostics", async (req, res) => {
  await healthDiagnosticsHandler.handle(req, res);
});

/**
 * Schema validation endpoint
 *
 * GET /krapi/k1/health/validate-schema
 *
 * Validates database schema against expected structure.
 */
router.get("/health/validate-schema", async (req, res) => {
  await validateSchemaHandler.handle(req, res);
});

/**
 * Auto-fix database issues endpoint
 *
 * POST /krapi/k1/health/auto-fix
 *
 * Automatically fixes database schema issues.
 */
router.post("/health/auto-fix", async (req, res) => {
  await autoFixHandler.handle(req, res);
});

/**
 * Database migration endpoint
 *
 * POST /krapi/k1/health/migrate
 *
 * Runs database migrations.
 */
router.post("/health/migrate", async (req, res) => {
  await migrateHandler.handle(req, res);
});

/**
 * Health statistics endpoint
 *
 * GET /krapi/k1/health/stats
 *
 * Returns health statistics including database and system metrics.
 */
router.get("/health/stats", async (req, res) => {
  await healthStatsHandler.handle(req, res);
});

/**
 * Database repair endpoint
 *
 * POST /krapi/k1/health/repair
 * POST /krapi/k1/health/database/repair (SDK compatibility)
 *
 * Repairs database issues.
 */
router.post("/health/repair", async (req, res) => {
  await repairHandler.handle(req, res);
});

// SDK compatibility: health.autoFix() calls /health/database/repair
router.post("/health/database/repair", async (req, res) => {
  await repairHandler.handle(req, res);
});

// ===== System Routes =====
/**
 * System information endpoint
 *
 * GET /krapi/k1/system/info
 *
 * Returns basic system information.
 */
router.get("/system/info", async (req, res) => {
  await systemInfoHandler.handle(req, res);
});

/**
 * System status endpoint
 *
 * GET /krapi/k1/system/status
 *
 * Returns detailed system status including server, database, and services.
 */
router.get("/system/status", async (req, res) => {
  await systemStatusHandler.handle(req, res);
});

/**
 * System settings endpoint
 *
 * GET /krapi/k1/system/settings
 *
 * Returns system-wide settings.
 */
router.get("/system/settings", async (req, res) => {
  await systemSettingsHandler.handle(req, res);
});

// Additional system routes can be added here as needed
// Examples: /system/backup, /system/logs, /system/maintenance

// ===== Mount Route Modules =====
/**
 * Authentication routes
 *
 * /krapi/k1/auth/*
 */
router.use("/auth", authRoutes);

/**
 * Admin routes
 *
 * /krapi/k1/admin/*
 */
router.use("/admin", adminRoutes);

/**
 * API Keys routes
 *
 * /krapi/k1/api-keys/*
 */
router.use("/api-keys", apiKeysRoutes);

/**
 * Project routes
 *
 * /krapi/k1/projects/*
 */
router.use("/projects", enforceProjectOrigin, projectRoutes);

/**
 * Collections routes (nested under projects)
 *
 * /krapi/k1/projects/:projectId/collections/*
 */
router.use("/projects/:projectId/collections", collectionsRoutes);

/**
 * Storage routes (nested under projects)
 *
 * /krapi/k1/projects/:projectId/storage/*
 */
router.use("/projects/:projectId/storage", storageRoutes);

/**
 * Users routes (nested under projects)
 *
 * /krapi/k1/projects/:projectId/users/*
 */
router.use("/projects/:projectId/users", usersRoutes);

/**
 * Email routes (nested under projects)
 *
 * /krapi/k1/projects/:projectId/email/*
 */
router.use("/projects/:projectId/email", emailRoutes);

/**
 * Backup routes (nested under projects)
 *
 * /krapi/k1/projects/:projectId/backup/*
 */
router.use("/projects/:projectId/backup", backupRoutes);

// SDK compatibility: /projects/:projectId/backups (plural)
router.get(
  "/projects/:projectId/backups",
  authenticate,
  requireScopes({ scopes: [Scope.PROJECTS_READ], projectSpecific: true }),
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { type } = req.query;
    const backendSDK = req.app.get("backendSDK") as BackendSDK;

    if (!backendSDK) {
      return res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      });
    }

    try {
      const backups = await backendSDK.backup.listBackups(
        projectId,
        type as "project" | "system" | undefined
      );

      return res.json({
        success: true,
        data: backups,
      });
    } catch (error) {
      console.error("Error listing project backups:", error);
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list project backups",
      });
    }
  }
);

/**
 * System routes
 *
 * /krapi/k1/system/*
 */
router.use("/system", systemRoutes);

/**
 * Changelog routes
 *
 * /krapi/k1/changelog/*
 * Also register /projects/:projectId/changelog for SDK compatibility
 */
router.use("/changelog", changelogRoutes);

// SDK compatibility: /projects/:projectId/changelog
router.get(
  "/projects/:projectId/changelog",
  authenticate,
  requireScopes({ scopes: [Scope.PROJECTS_READ], projectSpecific: true }),
  async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const backendSDK = req.app.get("backendSDK") as BackendSDK;
      if (!backendSDK) {
        return res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
      }

      // Use SDK method for getting project changelog
      // BackendSDK uses ChangelogService.getByEntity, not the adapter method
      const projectId = req.params.projectId;
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
      }
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const changelogResult = await backendSDK.changelog.getByEntity(
        "project",
        projectId,
        { limit, offset }
      );

      // Extract entries array from result (SDK returns array or object with entries/data)
      let entries: unknown[] = [];
      if (Array.isArray(changelogResult)) {
        entries = changelogResult;
      } else if (
        changelogResult &&
        typeof changelogResult === "object" &&
        changelogResult !== null
      ) {
        if (
          "entries" in changelogResult &&
          Array.isArray((changelogResult as { entries: unknown }).entries)
        ) {
          entries = (changelogResult as { entries: unknown[] }).entries;
        } else if (
          "data" in changelogResult &&
          Array.isArray((changelogResult as { data: unknown }).data)
        ) {
          entries = (changelogResult as { data: unknown[] }).data;
        }
      }

      // CRITICAL: Always ensure entries is an array (never null/undefined/object)
      if (!Array.isArray(entries)) {
        entries = [];
      }

      return res.json({
        success: true,
        data: entries,
      });
    } catch (error) {
      console.error("Error getting project changelog:", error);
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get project changelog",
      });
    }
  }
);

/**
 * Backup routes
 *
 * /krapi/k1/backup/*
 * Also register /backups for SDK compatibility (SDK calls /backups directly)
 */
router.use("/backup", backupRoutes);

// Direct route for /backups (SDK compatibility)
// SDK calls /backups directly, so we need a direct handler here
router.delete(
  "/backups/:backupId",
  authenticate,
  requireScopes({ scopes: [Scope.PROJECTS_WRITE] }),
  async (req: Request, res: Response) => {
    try {
      const { backupId } = req.params;
      const { password } = req.body || {};
      const backendSDK = req.app.get("backendSDK") as BackendSDK;

      if (!backendSDK) {
        return res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
      }

      if (!backupId) {
        return res.status(400).json({
          success: false,
          error: "Backup ID is required",
        });
      }

      // Pass password if provided (required for Restic repository access)
      // For tests, use default test password if none provided
      const deletePassword = password || process.env.TEST_BACKUP_PASSWORD || "test-backup-password-123";
      
      // Get backup service directly since SDK adapter doesn't pass password
      const backupService = (backendSDK.backup as unknown as { service?: { deleteBackup: (snapshotId: string, password: string) => Promise<void> } }).service;
      
      if (backupService) {
        // Call service directly with password
        await backupService.deleteBackup(backupId, deletePassword);
      } else {
        // Fallback to SDK method (won't work without password, but try anyway)
        await backendSDK.backup.deleteBackup(backupId, deletePassword);
      }

      // SDK adapter's delete method (line 15395) checks for "success" in response
      // Since the interceptor returns response.data, response will be { success: true, message: ... }
      // The adapter will return { success: response.success } which is { success: true }
      return res.json({
        success: true,
        message: `Backup ${backupId} deleted successfully`,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete backup",
      });
    }
  }
);

router.get(
  "/backups",
  authenticate,
  requireScopes({ scopes: [Scope.PROJECTS_READ] }),
  async (req: Request, res: Response) => {
    const { project_id, type } = req.query;
    const backendSDK = req.app.get("backendSDK") as BackendSDK;

    if (!backendSDK) {
      return res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      });
    }

    try {
      const backupsResult = await backendSDK.backup.listBackups(
        project_id ? (project_id as string) : undefined,
        type as "project" | "system" | undefined
      );

      // Extract backups array from result (SDK returns array or object with backups/data)
      let backups: unknown[] = [];
      if (Array.isArray(backupsResult)) {
        backups = backupsResult;
      } else if (
        backupsResult &&
        typeof backupsResult === "object" &&
        backupsResult !== null
      ) {
        if (
          "backups" in backupsResult &&
          Array.isArray((backupsResult as { backups: unknown }).backups)
        ) {
          backups = (backupsResult as { backups: unknown[] }).backups;
        } else if (
          "data" in backupsResult &&
          Array.isArray((backupsResult as { data: unknown }).data)
        ) {
          backups = (backupsResult as { data: unknown[] }).data;
        }
      }

      // CRITICAL: Always ensure backups is an array (never null/undefined/object)
      if (!Array.isArray(backups)) {
        backups = [];
      }

      return res.json({
        success: true,
        data: backups,
      });
    } catch (error) {
      console.error("❌ [BACKUP DEBUG] List backups error:", error);
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to list backups",
      });
    }
  }
);

/**
 * Testing routes (development only)
 *
 * /krapi/k1/testing/*
 */
router.use("/testing", testingRoutes);

/**
 * MCP (Model Context Protocol) routes
 *
 * /krapi/k1/mcp/*
 */
router.use("/mcp", mcpRouter);

/**
 * Activity routes
 *
 * /krapi/k1/activity/*
 */
router.get("/activity/query", async (req, res) => {
  await queryActivityHandler.handle(req as ExtendedRequest, res);
});

router.post("/activity/query", async (req, res) => {
  await queryActivityHandler.handle(req as ExtendedRequest, res);
});

/**
 * Activity statistics endpoint
 *
 * GET /krapi/k1/activity/stats
 *
 * Returns activity statistics using SDK.
 */
router.get("/activity/stats", async (req, res) => {
  await activityStatsHandler.handle(req, res);
});

/**
 * Recent activity endpoint
 *
 * GET /krapi/k1/activity/recent
 *
 * Returns recent activity logs using SDK.
 */
router.get("/activity/recent", async (req, res) => {
  await recentActivityHandler.handle(req, res);
});

/**
 * User activity timeline endpoint
 *
 * GET /krapi/k1/activity/user/timeline
 *
 * Returns user activity timeline using SDK.
 */
router.get("/activity/user/timeline", async (req, res) => {
  await userTimelineHandler.handle(req, res);
});

/**
 * Activity cleanup endpoint
 *
 * POST /krapi/k1/activity/cleanup
 *
 * Cleans up old activity logs using SDK.
 */
router.post("/activity/cleanup", async (req, res) => {
  await activityCleanupHandler.handle(req, res);
});

/**
 * Activity logging endpoint
 *
 * POST /krapi/k1/activity/log
 *
 * Logs activity using SDK.
 */
router.post("/activity/log", async (req, res): Promise<void> => {
  // Use the same handler as admin route for consistency
  // Import LogActivityHandler from admin handlers
  const { LogActivityHandler } = await import(
    "./handlers/admin/log-activity.handler"
  );
  // Get backendSDK from app context
  const sdk = req.app.get("backendSDK") as BackendSDK;
  if (!sdk) {
    res.status(500).json({
      success: false,
      error: "BackendSDK not initialized",
    });
    return;
  }
  const logActivityHandler = new LogActivityHandler(sdk);
  await logActivityHandler.handle(req, res);
});

/**
 * Queue metrics endpoint
 *
 * GET /krapi/k1/queue/metrics
 *
 * Returns queue metrics from DatabaseService.
 */
router.get("/queue/metrics", async (req, res) => {
  await queueMetricsHandler.handle(req, res);
});

/**
 * User activity endpoint
 *
 * GET /krapi/k1/projects/:projectId/users/:userId/activity
 *
 * Returns activity logs for a specific user in a project.
 */
router.get(
  "/projects/:projectId/users/:userId/activity",
  authenticate,
  async (req, res) => {
    await getUserActivityHandler.handle(req, res);
  }
);

/**
 * Validate API key endpoint
 *
 * POST /krapi/k1/auth/validate-key
 *
 * Validates an API key and returns information about it.
 */
router.post("/auth/validate-key", async (req, res) => {
  await validateKeyHandler.handle(req, res);
});

/**
 * Initialize database endpoint
 *
 * POST /krapi/k1/database/initialize
 *
 * Initializes the database by creating missing tables and performing setup.
 * Server-only operation.
 */
router.post("/database/initialize", authenticate, async (req, res) => {
  await initializeDatabaseHandler.handle(req, res);
});

/**
 * Create default admin endpoint
 *
 * POST /krapi/k1/database/create-default-admin
 *
 * Creates the default admin user (username: admin, password: admin123).
 * Server-only operation.
 */
router.post(
  "/database/create-default-admin",
  authenticate,
  async (req, res) => {
    await createDefaultAdminHandler.handle(req, res);
  }
);

export default router;
