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
 * 
 * SDK-driven implementation using BackendSDK for all functionality.
 * All routes require authentication and admin scopes.
 * 
 * @module routes/admin.routes
 */
import { BackendSDK } from "@krapi/sdk";
import { Router, IRouter } from "express";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { DatabaseService } from "@/services/database.service";
import { Scope, AuthenticatedRequest } from "@/types";

const router: IRouter = Router();

// Initialize the BackendSDK - will be set from app.ts
let backendSDK: BackendSDK;

/**
 * Initialize BackendSDK for admin routes
 * 
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeAdminSDK = (sdk: BackendSDK) => {
  backendSDK = sdk;
};

// All routes require authentication
router.use(authenticate);

// Admin user management
router.get(
  "/users",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const users = await backendSDK.admin.getUsers();
      return res.json({ success: true, data: users });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get admin users",
      });
    }
  }
);

router.get(
  "/users/:userId",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { userId } = req.params;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      const user = await backendSDK.admin.getUserById(userId);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Admin user not found" });
      }

      return res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get admin user",
      });
    }
  }
);

router.post(
  "/users",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const userData = req.body;
      const user = await backendSDK.admin.createUser(userData);
      return res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create admin user",
      });
    }
  }
);

router.put(
  "/users/:userId",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { userId } = req.params;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      const updates = req.body;
      const user = await backendSDK.admin.updateUser(userId, updates);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Admin user not found" });
      }

      return res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update admin user",
      });
    }
  }
);

router.delete(
  "/users/:userId",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { userId } = req.params;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      const success = await backendSDK.admin.deleteUser(userId);

      if (!success) {
        return res
          .status(404)
          .json({ success: false, error: "Admin user not found" });
      }

      return res.json({ success: true, message: "Admin user deleted successfully" });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete admin user",
      });
    }
  }
);

// User API key management
router.get(
  "/users/:userId/api-keys",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { userId } = req.params;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      const apiKeys = await backendSDK.admin.getUserApiKeys(userId);
      return res.json({ success: true, data: apiKeys });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get user API keys",
      });
    }
  }
);

router.post(
  "/users/:userId/api-keys",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { userId } = req.params;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      const apiKeyData = req.body;
      const apiKey = await backendSDK.admin.createUserApiKey(
        userId,
        apiKeyData
      );
      return res.status(201).json({ success: true, data: apiKey });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create user API key",
      });
    }
  }
);

// Admin API key management
router.post(
  "/api-keys",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { name, permissions, expires_at } = req.body;

      // Get current user ID from authenticated request
      const currentUser = (req as AuthenticatedRequest).user;
      if (!currentUser || !currentUser.id) {
        return res
          .status(401)
          .json({ success: false, error: "User not authenticated" });
      }

      // Create admin API key with custom permissions
      const apiKey = await backendSDK.admin.createApiKey(currentUser.id, {
        name: name || "Admin API Key",
        permissions: permissions || [],
        expires_at: expires_at || undefined,
      });

      res.status(201).json({ success: true, data: apiKey });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create admin API key",
      });
    }
  }
);

// Master API key management
router.post(
  "/master-api-keys",
  requireScopes({
    scopes: [Scope.MASTER],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const apiKey = await backendSDK.admin.createMasterApiKey();
      res.status(201).json({ success: true, data: apiKey });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create master API key",
      });
    }
  }
);

router.delete(
  "/api-keys/:keyId",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { keyId } = req.params;
      if (!keyId) {
        return res
          .status(400)
          .json({ success: false, error: "API key ID is required" });
      }
      const success = await backendSDK.admin.deleteApiKey(keyId);

      if (!success) {
        return res
          .status(404)
          .json({ success: false, error: "API key not found" });
      }

      return res.json({ success: true, message: "API key deleted successfully" });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete API key",
      });
    }
  }
);

// System management
router.get(
  "/system/stats",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const stats = await backendSDK.admin.getSystemStats();
      return res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get system stats",
      });
    }
  }
);

// Database health check
router.get(
  "/system/db-health",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const health = await backendSDK.performHealthCheck();
      return res.json({ success: true, data: health });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get database health",
      });
    }
  }
);

// Database repair (master admin only)
router.post(
  "/system/db-repair",
  requireScopes({
    scopes: [Scope.MASTER],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const repairResult = await backendSDK.autoFixDatabase();
      return res.json({
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
        error:
          error instanceof Error ? error.message : "Failed to repair database",
      });
    }
  }
);

// System diagnostics
router.post(
  "/system/diagnostics",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const diagnostics = await backendSDK.health.runDiagnostics();
      return res.json({ success: true, data: diagnostics });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to run diagnostics",
      });
    }
  }
);

// Admin account management routes
router.put(
  "/users/:userId/enable",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      const db = DatabaseService.getInstance();

      const success = await db.enableAdminAccount(userId);
      if (success) {
        return res.json({
          success: true,
          message: "Admin account enabled successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          error: "Admin account not found",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to enable admin account",
      });
    }
  }
);

router.put(
  "/users/:userId/disable",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      const db = DatabaseService.getInstance();

      const success = await db.disableAdminAccount(userId);
      if (success) {
        return res.json({
          success: true,
          message: "Admin account disabled successfully",
        });
      } else {
        return res.status(404).json({
          success: false,
          error: "Admin account not found",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to disable admin account",
      });
    }
  }
);

router.get(
  "/users/:userId/status",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, error: "User ID is required" });
      }
      const db = DatabaseService.getInstance();

      const status = await db.getAdminAccountStatus(userId);
      if (status) {
        return res.json({
          success: true,
          data: status,
        });
      } else {
        return res.status(404).json({
          success: false,
          error: "Admin account not found",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get admin account status",
      });
    }
  }
);

// Activity logs
router.get(
  "/activity",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { limit = 100, offset = 0 } = req.query;
      const logs = await backendSDK.admin.getActivityLogs({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      return res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get activity logs",
      });
    }
  }
);

// Activity logging
router.post(
  "/activity/log",
  requireScopes({
    scopes: [Scope.ADMIN_WRITE],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const activityData = req.body;
      const loggedActivity = await backendSDK.activity.log(activityData);

      return res.json({ success: true, data: loggedActivity });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to log activity",
      });
    }
  }
);

// Activity query
router.get(
  "/activity/query",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const queryOptions = req.query;
      const result = await backendSDK.activity.query(queryOptions);

      return res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to query activity logs",
      });
    }
  }
);

// Activity statistics
router.get(
  "/activity/stats",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { project_id, days } = req.query;
      const stats = await backendSDK.activity.getActivityStats(
        project_id ? (project_id as string) : undefined,
        days ? parseInt(days as string) : 30
      );

      return res.json({ success: true, ...stats });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get activity statistics",
      });
    }
  }
);

export default router;
