// import { Request, Response } from "express";

// import { backendSDK } from "@/lib/backend-sdk";
// import { ApiResponse, ChangeAction, AdminRole } from "@/types";

/**
 * Admin Controller
 * 
 * Handles all admin-related operations including:
 * - Admin user management
 * - System statistics
 * - Database health checks
 * - Activity logs
 * 
 * **STATUS: TEMPORARILY DISABLED**
 * 
 * This controller is currently commented out and will be reimplemented using direct services.
 * All admin functionality is currently handled through the admin routes using SDK services.
 * 
 * @module controllers/admin.controller
 * @deprecated This controller is disabled - use admin routes with SDK services instead
 */
/*
export class AdminController {
  // Get all admin users
  getAllAdminUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      // Use BackendSDK for getting admin users
      const result = await backendSDK.admin.getUsers({
        page: pageNum,
        limit: limitNum,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error("Get all admin users error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to fetch admin users",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Get admin user by ID
  getAdminUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Use BackendSDK for getting admin user
      const result = await backendSDK.admin.getUserById(id);

      res.status(200).json(result);
    } catch (error) {
      console.error("Get admin user by ID error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to fetch admin user",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Create admin user
  createAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, username, _password, role, access_level } = req.body;

      // Create user using BackendSDK
      const result = await backendSDK.admin.createUser({
        email,
        username,
        role: role || AdminRole.ADMIN,
        access_level: access_level || "full",
        permissions: [],
        active: true,
      });

      if (result.success && result.data) {
        // Log the action using the changelog service
        await backendSDK.changelog.create({
          entity_type: "admin_user",
          entity_id: result.data.id,
          action: ChangeAction.CREATED,
          performed_by: "system",
        });

        res.status(201).json({
          success: true,
          data: result.data,
          message: "Admin user created successfully",
        } as ApiResponse);
      } else {
        res.status(400).json({
          success: false,
          error: "Failed to create admin user",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Create admin user error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to create admin user",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Update admin user
  updateAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Update user using BackendSDK
      const result = await backendSDK.admin.updateUser(id, updates);

      if (result.success && result.data) {
        // Log the action using the changelog service
        await backendSDK.changelog.create({
          entity_type: "admin_user",
          entity_id: id,
          action: ChangeAction.UPDATED,
          performed_by: "system",
        });

        res.status(200).json({
          success: true,
          data: result.data,
          message: "Admin user updated successfully",
        } as ApiResponse);
      } else {
        res.status(400).json({
          success: false,
          error: "Failed to update admin user",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Update admin user error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to update admin user",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Delete admin user
  deleteAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Delete user using BackendSDK
      const result = await backendSDK.admin.deleteUser(id);

      if (result.success) {
        // Log the action using the changelog service
        await backendSDK.changelog.create({
          entity_type: "admin_user",
          entity_id: id,
          action: ChangeAction.DELETED,
          performed_by: "system",
        });

        res.status(200).json({
          success: true,
          message: "Admin user deleted successfully",
        } as ApiResponse);
      } else {
        res.status(400).json({
          success: false,
          error: "Failed to delete admin user",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Delete admin user error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to delete admin user",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Toggle admin user status
  toggleAdminUserStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      // Toggle user status using BackendSDK
      const result = await backendSDK.admin.toggleUserStatus(id);

      if (result.success && result.data) {
        // Log the action using the changelog service
        await backendSDK.changelog.create({
          entity_type: "admin_user",
          entity_id: id,
          action: ChangeAction.UPDATED,
          performed_by: "system",
        });

        res.status(200).json({
          success: true,
          data: result.data,
          message: "Admin user status toggled successfully",
        } as ApiResponse);
      } else {
        res.status(400).json({
          success: false,
          error: "Failed to toggle admin user status",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Toggle admin user status error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to toggle admin user status",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Get admin user activity
  getAdminUserActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Get user using BackendSDK
      const user = await backendSDK.admin.getUserById(id);

      if (!user.success || !user.data) {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        } as ApiResponse);
        return;
      }

      // Get user activity using BackendSDK
      const result = await backendSDK.changelog.getByEntity("admin_user", id);

      res.status(200).json({
        success: true,
        data: result.data,
        message: "Admin user activity retrieved successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Get admin user activity error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to get admin user activity",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Get user API keys
  getUserApiKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // Get user using BackendSDK
      const user = await backendSDK.admin.getUserById(userId);

      if (!user.success || !user.data) {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        } as ApiResponse);
        return;
      }

      // Get user API keys using BackendSDK
      const result = await backendSDK.admin.getUserApiKeys(userId);

      res.status(200).json({
        success: true,
        data: result.data,
        message: "User API keys retrieved successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Get user API keys error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to get user API keys",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Create user API key
  createUserApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const keyData = req.body;

      // Get user using BackendSDK
      const user = await backendSDK.admin.getUserById(userId);

      if (!user.success || !user.data) {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        } as ApiResponse);
        return;
      }

      // Create API key using BackendSDK
      const result = await backendSDK.admin.createUserApiKey(userId, {
        name: keyData.name,
        scopes: keyData.scopes,
        expires_at: keyData.expires_at,
      });

      if (result.success && result.data) {
        // Log the action using the changelog service
        await backendSDK.changelog.create({
          entity_type: "api_key",
          entity_id: result.data.id,
          action: ChangeAction.CREATED,
          performed_by: "system",
        });

        res.status(201).json({
          success: true,
          data: result.data,
          message: "API key created successfully",
        } as ApiResponse);
      } else {
        res.status(400).json({
          success: false,
          error: "Failed to create API key",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Create user API key error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to create API key",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Delete API key
  deleteApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const { keyId } = req.params;

      // Delete API key using BackendSDK
      const result = await backendSDK.admin.deleteApiKey(keyId);

      if (result.success) {
        // Log the action using the changelog service
        await backendSDK.changelog.create({
          entity_type: "api_key",
          entity_id: keyId,
          action: ChangeAction.DELETED,
          performed_by: "system",
        });

        res.status(200).json({
          success: true,
          message: "API key deleted successfully",
        } as ApiResponse);
      } else {
        res.status(400).json({
          success: false,
          error: "Failed to delete API key",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Delete API key error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to delete API key",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Get system statistics
  getSystemStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get system stats using BackendSDK
      const result = await backendSDK.admin.getSystemStats();

      res.status(200).json({
        success: true,
        data: result.data,
        message: "System statistics retrieved successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Get system stats error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to get system statistics",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Get activity logs
  getActivityLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);

      // Get activity logs using BackendSDK
      const result = await backendSDK.admin.getActivityLogs({
        limit: limitNum,
        offset: offsetNum,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        message: "Activity logs retrieved successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Get activity logs error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to get activity logs",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Get database health
  getDatabaseHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get database health using BackendSDK
      const result = await backendSDK.admin.getDatabaseHealth();

      res.status(200).json({
        success: true,
        data: result.data,
        message: "Database health retrieved successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Get database health error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to get database health",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Repair database
  repairDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      // Repair database using BackendSDK
      const result = await backendSDK.admin.repairDatabase();

      if (result.success) {
        // Log the action using the changelog service
        await backendSDK.changelog.create({
          entity_type: "database",
          entity_id: "system",
          action: ChangeAction.UPDATED,
          performed_by: "system",
        });

        res.status(200).json({
          success: true,
          data: result.data,
          message: "Database repair completed successfully",
        } as ApiResponse);
      } else {
        res.status(400).json({
          success: false,
          error: "Failed to repair database",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Repair database error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to repair database",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Run diagnostics
  runDiagnostics = async (req: Request, res: Response): Promise<void> => {
    try {
      // Run diagnostics using BackendSDK
      const result = await backendSDK.admin.runDiagnostics();

      res.status(200).json({
        success: true,
        data: result.data,
        message: "Diagnostics completed successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Run diagnostics error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to run diagnostics",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  };

  // Create master API key
  createMasterApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      // Create master API key using BackendSDK
      const result = await backendSDK.admin.createMasterApiKey();

      if (result.success && result.data) {
        // Log the action using the changelog service
        await backendSDK.changelog.create({
          entity_type: "master_api_key",
          entity_id: result.data.id,
          action: ChangeAction.CREATED,
          performed_by: "system",
        });

        res.status(201).json({
          success: true,
          data: result.data,
          message: "Master API key created successfully",
        } as ApiResponse);
      } else {
        res.status(400).json({
          success: false,
          error: "Failed to create master API key",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Create master API key error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDbError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED");

      res.status(isDbError ? 503 : 500).json({
        success: false,
        error: "Failed to create master API key",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
      } as ApiResponse);
    }
  }
}
*/

export default {}; // Temporary empty export
