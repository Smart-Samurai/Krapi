import { BackendSDK } from "@krapi/sdk";
import { Router, IRouter } from "express";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

/**
 * Admin Routes
 *
 * SDK-driven implementation using BackendSDK for all functionality
 */

const router: IRouter = Router();

// Initialize the BackendSDK - will be set from app.ts
let backendSDK: BackendSDK;

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
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({
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
      const user = await backendSDK.admin.getUserById(userId);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Admin user not found" });
      }

      res.json({ success: true, data: user });
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
      res.status(201).json({ success: true, data: user });
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
      const updates = req.body;
      const user = await backendSDK.admin.updateUser(userId, updates);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Admin user not found" });
      }

      res.json({ success: true, data: user });
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
      const success = await backendSDK.admin.deleteUser(userId);

      if (!success) {
        return res
          .status(404)
          .json({ success: false, error: "Admin user not found" });
      }

      res.json({ success: true, message: "Admin user deleted successfully" });
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
      const apiKeys = await backendSDK.admin.getUserApiKeys(userId);
      res.json({ success: true, data: apiKeys });
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
      const apiKeyData = req.body;
      const apiKey = await backendSDK.admin.createUserApiKey(
        userId,
        apiKeyData
      );
      res.status(201).json({ success: true, data: apiKey });
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
      const currentUser = (req as any).user;
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
      const success = await backendSDK.admin.deleteApiKey(keyId);

      if (!success) {
        return res
          .status(404)
          .json({ success: false, error: "API key not found" });
      }

      res.json({ success: true, message: "API key deleted successfully" });
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
      res.json({ success: true, data: stats });
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
      res.json({ success: true, data: health });
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
      res.json({
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
      res.json({ success: true, data: diagnostics });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to run diagnostics",
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

      res.json({ success: true, data: logs });
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

export default router;
