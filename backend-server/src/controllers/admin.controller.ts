import { Request, Response } from "express";
import {
  AuthenticatedRequest,
  ApiResponse,
  ChangeAction,
  AdminRole,
} from "@/types";
import { DatabaseService } from "@/services/database.service";
import { AuthService } from "@/services/auth.service";
import { EmailService } from "@/services/email.service";
import { StorageService } from "@/services/storage.service";

export class AdminController {
  private db: DatabaseService;
  private authService: AuthService;
  private emailService: EmailService;
  private storageService: StorageService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.authService = AuthService.getInstance();
    this.emailService = EmailService.getInstance();
    this.storageService = StorageService.getInstance();
  }

  // Get all admin users
  getAllAdminUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      // Get admin users directly from database
      const users = await this.db.getAllAdminUsers();
      const total = users.length;
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedUsers = users.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        data: paginatedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: endIndex < total,
          hasPrev: pageNum > 1,
        },
      });
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
      return;
    }
  };

  // Get admin user by ID
  getAdminUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Get admin user directly from database
      const user = await this.db.getAdminUserById(id);

      if (user) {
        res.status(200).json({
          success: true,
          data: user,
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        });
      }
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
      return;
    }
  };

  // Create admin user
  createAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const {
        email,
        username,
        password,
        role,
        access_level,
        permissions = [],
      } = req.body;

      // Create user in database
      const user = await this.db.createAdminUser({
        email,
        username,
        password,
        role,
        access_level,
        permissions,
        password_hash: "", // Will be set by the service
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (user) {
        // Log the action using the SDK
        await this.db.createChangelogEntry({
          entity_type: "admin_user",
          entity_id: user.id,
          action: ChangeAction.CREATED,
          changes: { email, username, role, access_level },
          performed_by: currentUser?.id || "system",
          session_id: authReq.session?.id,
        });

        res.status(201).json({
          success: true,
          data: user,
        });
      } else {
        res.status(400).json({
          success: false,
          error: "Failed to create admin user",
        });
      }
    } catch (error) {
      console.error("Create admin user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create admin user",
      } as ApiResponse);
      return;
    }
  };

  // Update admin user
  updateAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;
      const updates = req.body;

      // Prevent users from modifying their own role (unless master admin)
      if (
        currentUser?.id === id &&
        updates.role &&
        "role" in currentUser &&
        currentUser.role !== "master_admin"
      ) {
        res.status(403).json({
          success: false,
          error: "Cannot modify your own role",
        } as ApiResponse);
        return;
      }

      // Update user in database
      const user = await this.db.updateAdminUser(id, updates);

      if (user) {
        // Log the action using the SDK
        await this.db.createChangelogEntry({
          entity_type: "admin_user",
          entity_id: id,
          action: ChangeAction.UPDATED,
          changes: updates,
          performed_by: currentUser?.id || "system",
          session_id: authReq.session?.id,
        });

        res.status(200).json({
          success: true,
          data: user,
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        });
      }
    } catch (error) {
      console.error("Update admin user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update admin user",
      } as ApiResponse);
      return;
    }
  };

  // Delete admin user
  deleteAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;

      // Prevent users from deleting themselves
      if (currentUser?.id === id) {
        res.status(403).json({
          success: false,
          error: "Cannot delete your own account",
        } as ApiResponse);
        return;
      }

      // Delete user from database
      const user = await this.db.deleteAdminUser(id);

      if (user) {
        // Log the action using the SDK
        await this.db.createChangelogEntry({
          entity_type: "admin_user",
          entity_id: id,
          action: ChangeAction.DELETED,
          changes: { deleted_user: id },
          performed_by: currentUser?.id || "system",
          session_id: authReq.session?.id,
        });

        res.status(200).json({
          success: true,
          message: "Admin user deleted successfully",
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        });
      }
    } catch (error) {
      console.error("Delete admin user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete admin user",
      } as ApiResponse);
      return;
    }
  };

  // Toggle admin user active status
  toggleAdminUserStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;

      // Prevent users from deactivating themselves
      if (currentUser?.id === id) {
        res.status(403).json({
          success: false,
          error: "Cannot deactivate your own account",
        } as ApiResponse);
        return;
      }

      // Get current user status first, then toggle
      const user = await this.db.getAdminUserById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        });
        return;
      }

      // Update user in database
      const result = await this.db.updateAdminUser(id, {
        active: !user.active,
      });

      if (result) {
        // Log the action using the SDK
        await this.db.createChangelogEntry({
          entity_type: "admin_user",
          entity_id: id,
          action: ChangeAction.UPDATED,
          changes: { active: result.active },
          performed_by: currentUser?.id || "system",
          session_id: authReq.session?.id,
        });

        res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        });
      }
    } catch (error) {
      console.error("Toggle admin user status error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update admin user status",
      } as ApiResponse);
      return;
    }
  };

  // Get admin user activity logs
  getAdminUserActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      // Check if user exists using the SDK
      const user = await this.db.getAdminUserById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        });
        return;
      }

      // Get changelog entries for this user using the SDK
      const result = await this.db.getChangelogEntries({
        entity_type: "admin_user",
        entity_id: id,
        limit: parseInt(limit as string),
      });

      if (result) {
        res.status(200).json(result);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to fetch admin user activity",
        });
      }
    } catch (error) {
      console.error("Get admin user activity error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch admin user activity",
      } as ApiResponse);
      return;
    }
  };

  // Get user API keys
  getUserApiKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // Check if user exists using the SDK
      const user = await this.db.getAdminUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        });
        return;
      }

      // Get API keys for the user using the SDK
      const result = await this.db.getApiKeysByOwner(userId);

      if (result) {
        res.status(200).json(result);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to fetch API keys",
        });
      }
    } catch (error) {
      console.error("Get user API keys error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch API keys",
      } as ApiResponse);
      return;
    }
  };

  // Create user API key
  createUserApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { userId } = req.params;
      const { name, scopes, project_ids } = req.body;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Check if user exists using the SDK
      const user = await this.db.getAdminUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: "Admin user not found",
        });
        return;
      }

      // Create API key in database
      const result = await this.db.createApiKey({
        owner_id: userId,
        name,
        type: "admin",
        scopes: scopes || [],
        project_ids: project_ids || null,
      });

      if (result) {
        // Log the action using the SDK
        await this.db.createChangelogEntry({
          entity_type: "api_key",
          entity_id: result.id,
          action: ChangeAction.CREATED,
          changes: { name, scopes, user_id: userId },
          performed_by: currentUser.id,
          session_id: authReq.session?.id,
        });

        res.status(201).json(result);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to create API key",
        });
      }
    } catch (error) {
      console.error("Create user API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create API key",
      } as ApiResponse);
      return;
    }
  };

  // Delete API key
  deleteApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { keyId } = req.params;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Delete API key from database
      const result = await this.db.deleteApiKey(keyId);

      if (result) {
        // Log the action using the SDK
        await this.db.createChangelogEntry({
          entity_type: "api_key",
          entity_id: keyId,
          action: ChangeAction.DELETED,
          changes: { deleted_key: keyId },
          performed_by: currentUser.id,
          session_id: authReq.session?.id,
        });

        res.status(200).json({
          success: true,
          message: "API key deleted successfully",
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
      }
    } catch (error) {
      console.error("Delete API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete API key",
      } as ApiResponse);
      return;
    }
  };

  // Create master API key
  createMasterApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Only master admins can create master API keys
      if (currentUser.role !== "master_admin") {
        res.status(403).json({
          success: false,
          error: "Only master administrators can create master API keys",
        } as ApiResponse);
        return;
      }

      const { name = "Master API Key", scopes = ["master"] } = req.body;

      // Create master API key in database
      const result = await this.db.createUserApiKey({
        user_id: "system",
        name,
        key: `mak_${Math.random().toString(36).substring(2)}`,
        type: "master",
        scopes: scopes || [],
        project_ids: null,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        last_used_at: null,
        active: true,
      });

      if (result) {
        // Log the action using the SDK
        await this.db.createChangelogEntry({
          entity_type: "api_key",
          entity_id: result.id,
          action: ChangeAction.CREATED,
          changes: { name, scopes, type: "master" },
          performed_by: currentUser.id,
          session_id: authReq.session?.id,
        });

        res.status(201).json(result);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to create master API key",
        });
      }
    } catch (error) {
      console.error("Create master API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create master API key",
      } as ApiResponse);
    }
  };

  // Get system statistics
  getSystemStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get system stats directly from database
      const result = await this.db.performHealthCheck();

      if (result) {
        res.status(200).json(result);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to fetch system statistics",
        });
      }
    } catch (error) {
      console.error("Get system stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch system statistics",
      } as ApiResponse);
    }
  };

  // Get activity logs
  getActivityLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        limit = 100,
        offset = 0,
        entity_type,
        action,
        user_id,
      } = req.query;

      // Get activity logs directly from database
      const result = await this.db.getActivityLogs({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        filters: {
          entity_type: entity_type as string,
          action: action as string,
          performed_by: user_id as string,
        },
      });

      if (result) {
        res.status(200).json(result);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to fetch activity logs",
        });
      }
    } catch (error) {
      console.error("Get activity logs error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch activity logs",
      } as ApiResponse);
    }
  };

  // Get database health
  getDatabaseHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get database health directly from database
      const result = await this.db.checkHealth();

      if (result) {
        res.status(result.healthy ? 200 : 503).json(result);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to check database health",
        });
      }
    } catch (error) {
      console.error("Get database health error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check database health",
      } as ApiResponse);
    }
  };

  // Repair database
  repairDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Double-check master admin role
      if (currentUser.role !== AdminRole.MASTER_ADMIN) {
        res.status(403).json({
          success: false,
          error: "Only master admins can repair the database",
        } as ApiResponse);
        return;
      }

      // Repair database directly
      const result = await this.db.repairDatabase();

      if (result) {
        // Log the repair action using the SDK
        await this.db.createChangelogEntry({
          entity_type: "system",
          entity_id: "database",
          action: ChangeAction.UPDATED,
          changes: { action: "repair", repairs: result.actions },
          performed_by: currentUser.id,
          session_id: authReq.session?.id,
        });

        res.status(200).json(result);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to repair database",
        });
      }
    } catch (error) {
      console.error("Repair database error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to repair database",
      } as ApiResponse);
    }
  };

  // Run system diagnostics
  runDiagnostics = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Run diagnostics directly
      const result = await this.db.performHealthCheck();

      if (result) {
        res.status(200).json(result);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to run diagnostics",
        });
      }
    } catch (error) {
      console.error("Run diagnostics error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to run diagnostics",
      } as ApiResponse);
    }
  };
}

export default new AdminController();
