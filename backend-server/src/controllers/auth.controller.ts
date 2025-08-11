import { Request, Response } from "express";
import { AuthService } from "@/services/auth.service";
import { DatabaseService } from "@/services/database.service";
import {
  AuthenticatedRequest,
  ApiResponse,
  SessionType,
  Scope,
  AdminPermission,
} from "@/types";
import { v4 as uuidv4 } from "uuid";

/**
 * Authentication Controller
 *
 * Handles all authentication-related operations including:
 * - Admin and project session creation
 * - User login/logout
 * - Password management
 * - API key regeneration
 * - Session validation
 */
export class AuthController {
  private authService: AuthService;
  private db: DatabaseService;

  constructor() {
    this.authService = AuthService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  /**
   * Create admin session using API key
   * POST /krapi/k1/auth/admin/session
   *
   * Creates a new admin session token from a valid admin or master API key.
   * The session inherits the scopes from the API key.
   *
   * @param req - Request with api_key in body
   * @param res - Response with session token and expiration
   */
  createAdminSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { api_key } = req.body;

      // Get admin user by API key
      const adminUser = await this.db.getAdminUserByApiKey(api_key);
      if (!adminUser || !adminUser.active) {
        res.status(401).json({
          success: false,
          error: "Invalid or inactive API key",
        } as ApiResponse);
        return;
      }

      // Create session
      const sessionToken = `admin_${uuidv4().replace(/-/g, "")}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const session = await this.db.createSession({
        token: sessionToken,
        user_id: adminUser.id,
        project_id: null,
        type: SessionType.ADMIN,
        scopes: this.mapAdminPermissionsToScopes(adminUser.permissions || []),
        metadata: {
          role: adminUser.role,
          access_level: adminUser.access_level,
        },
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        consumed: false,
      });

      // Log session creation
      await this.authService.logAuthAction(
        "session_created",
        "admin",
        undefined,
        session.id
      );

      res.status(200).json({
        success: true,
        data: {
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          user: {
            id: adminUser.id,
            username: adminUser.username,
            email: adminUser.email,
            role: adminUser.role,
            access_level: adminUser.access_level,
          },
        },
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Create admin session error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create session",
      } as ApiResponse);
      return;
    }
  };

  // Create project session
  createProjectSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { api_key } = req.body;

      // Get project by API key
      const project = await this.db.getProjectByApiKey(api_key);
      if (!project || !project.active) {
        res.status(401).json({
          success: false,
          error: "Invalid or inactive project API key",
        } as ApiResponse);
        return;
      }

      // Create session
      const sessionToken = `project_${uuidv4().replace(/-/g, "")}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const session = await this.db.createSession({
        token: sessionToken,
        user_id: null,
        project_id: project.id,
        type: SessionType.PROJECT,
        scopes: [Scope.DOCUMENTS_READ, Scope.DOCUMENTS_WRITE],
        metadata: { role: "user" },
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        consumed: false,
      });

      // Log session creation
      await this.authService.logAuthAction(
        "session_created",
        "project",
        projectId,
        session.id
      );

      res.status(200).json({
        success: true,
        data: {
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
          },
        },
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Create project session error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create session",
      } as ApiResponse);
      return;
    }
  };

  // Admin login with username/password
  adminLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: "Username and password are required",
        } as ApiResponse);
        return;
      }

      // Verify admin credentials
      const adminUser = await this.db.verifyAdminPassword(username, password);
      if (!adminUser || !adminUser.active) {
        res.status(401).json({
          success: false,
          error: "Invalid credentials or inactive account",
        } as ApiResponse);
        return;
      }

      // Create session
      const sessionToken = `admin_${uuidv4().replace(/-/g, "")}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const session = await this.db.createSession({
        token: sessionToken,
        user_id: adminUser.id,
        project_id: null,
        type: SessionType.ADMIN,
        scopes: this.mapAdminPermissionsToScopes(adminUser.permissions || []),
        metadata: {
          role: adminUser.role,
          access_level: adminUser.access_level,
        },
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        consumed: false,
      });

      // Update last login
      await this.db.updateLoginInfo(adminUser.id);

      // Log login
      await this.authService.logAuthAction(
        "login",
        "admin",
        undefined,
        session.id
      );

      res.status(200).json({
        success: true,
        data: {
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          user: {
            id: adminUser.id,
            username: adminUser.username,
            email: adminUser.email,
            role: adminUser.role,
            access_level: adminUser.access_level,
          },
        },
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        error: "Login failed",
      } as ApiResponse);
      return;
    }
  };

  // Validate session
  validateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { session_token } = req.body;

      const session = await this.db.getSessionByToken(session_token);
      if (!session) {
        res.status(401).json({
          success: false,
          error: "Invalid or expired session",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          expires_at: session.expires_at,
          type: session.type,
        },
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Validate session error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to validate session",
      } as ApiResponse);
      return;
    }
  };

  // Logout (invalidate session)
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const session = authReq.session;
      const user = authReq.user;

      if (session && !session.consumed) {
        // Consume the session to invalidate it
        await this.db.consumeSession(session.token);
      }

      // Log logout
      if (user) {
        await this.authService.logAuthAction(
          "logout",
          user.id,
          undefined,
          session?.id
        );
      }

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        error: "Logout failed",
      } as ApiResponse);
      return;
    }
  };

  // Get current user info
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const authUser = authReq.user;

      if (!authUser) {
        res.status(401).json({
          success: false,
          error: "Not authenticated",
        } as ApiResponse);
        return;
      }

      // Fetch full user data based on type
      if (authUser.type === "admin") {
        const adminUser = await this.db.getAdminUserById(authUser.id);
        if (!adminUser) {
          res.status(404).json({
            success: false,
            error: "User not found",
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            id: adminUser.id,
            email: adminUser.email,
            username: adminUser.username,
            role: adminUser.role,
            access_level: adminUser.access_level,
            permissions: adminUser.permissions,
            active: adminUser.active,
            created_at: adminUser.created_at,
            updated_at: adminUser.updated_at,
            last_login: adminUser.last_login,
            api_key: adminUser.api_key,
            login_count: adminUser.login_count || 0,
          },
        } as ApiResponse);
      } else {
        // ProjectUser
        const projectUser = await this.db.getProjectUser(
          authUser.project_id!,
          authUser.id
        );
        if (!projectUser) {
          res.status(404).json({
            success: false,
            error: "User not found",
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            id: projectUser.id,
            email: projectUser.email,
            username: projectUser.username,
            phone: projectUser.phone,
            is_active: projectUser.is_active,
          },
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user info",
      } as ApiResponse);
      return;
    }
  };

  // Change password
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const { current_password, new_password } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          error: "Not authenticated",
        } as ApiResponse);
        return;
      }

      // Get the full admin user data to verify password
      const adminUser = await this.db.getAdminUserById(user.id);
      if (!adminUser) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      // Verify current password
      const validUser = await this.authService.authenticateAdmin(
        adminUser.email,
        current_password
      );
      if (!validUser) {
        res.status(401).json({
          success: false,
          error: "Current password is incorrect",
        } as ApiResponse);
        return;
      }

      // Hash new password
      const hashedPassword = await this.authService.hashPassword(new_password);

      // Update password
      this.db.updateAdminUser(user.id, { password_hash: hashedPassword });

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to change password",
      } as ApiResponse);
      return;
    }
  };

  // Admin login with API key
  adminApiLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { api_key } = req.body;

      if (!api_key) {
        res.status(400).json({
          success: false,
          error: "API key is required",
        } as ApiResponse);
        return;
      }

      const adminUser = await this.db.getAdminUserByApiKey(api_key);

      if (!adminUser) {
        res.status(401).json({
          success: false,
          error: "Invalid API key",
        });
        return;
      }

      if (!adminUser.active) {
        res.status(401).json({
          success: false,
          error: "Account is deactivated",
        });
        return;
      }

      // Generate session token
      const sessionToken = `admin_${uuidv4().replace(/-/g, "")}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create session
      const session = await this.db.createSession({
        token: sessionToken,
        user_id: adminUser.id,
        project_id: null,
        type: SessionType.ADMIN,
        scopes: this.mapAdminPermissionsToScopes(adminUser.permissions || []),
        metadata: {
          role: adminUser.role,
          access_level: adminUser.access_level,
        },
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        consumed: false,
      });

      if (!session) {
        res.status(500).json({
          success: false,
          error: "Failed to create session",
        });
        return;
      }

      // Update login info
      await this.db.updateLoginInfo(adminUser.id);

      // Log the action
      await this.authService.logAuthAction("login", adminUser.id);

      res.json({
        success: true,
        data: {
          token: sessionToken,
          expires_at: expiresAt.toISOString(),
          user: {
            id: adminUser.id,
            username: adminUser.username,
            email: adminUser.email,
            role: adminUser.role,
            access_level: adminUser.access_level,
            permissions: adminUser.permissions,
          },
        },
      });
    } catch (error) {
      console.error("Admin API login error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to authenticate with API key",
      } as ApiResponse);
      return;
    }
  };

  // Regenerate API key for current user
  regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!authReq.user) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Generate new API key
      const newApiKey = `mak_${uuidv4().replace(/-/g, "")}`;

      // Update user with new API key
      const updated = await this.db.updateAdminUser(authReq.user.id, {
        api_key: newApiKey,
      });

      if (!updated) {
        res.status(500).json({
          success: false,
          error: "Failed to regenerate API key",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          api_key: newApiKey,
          message:
            "API key regenerated successfully. Save this key securely - it will not be shown again!",
        },
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Regenerate API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to regenerate API key",
      } as ApiResponse);
      return;
    }
  };

  private mapAdminPermissionsToScopes(permissions: AdminPermission[]): Scope[] {
    const permissionToScopeMap: Record<AdminPermission, Scope> = {
      "users.create": Scope.ADMIN_WRITE,
      "users.read": Scope.ADMIN_READ,
      "users.update": Scope.ADMIN_WRITE,
      "users.delete": Scope.ADMIN_WRITE,
      "projects.create": Scope.PROJECTS_WRITE,
      "projects.read": Scope.PROJECTS_READ,
      "projects.update": Scope.PROJECTS_WRITE,
      "projects.delete": Scope.PROJECTS_DELETE,
      "collections.create": Scope.COLLECTIONS_WRITE,
      "collections.read": Scope.COLLECTIONS_READ,
      "collections.write": Scope.COLLECTIONS_WRITE,
      "collections.delete": Scope.COLLECTIONS_DELETE,
      "storage.upload": Scope.STORAGE_WRITE,
      "storage.read": Scope.STORAGE_READ,
      "storage.delete": Scope.STORAGE_DELETE,
      "settings.read": Scope.ADMIN_READ,
      "settings.update": Scope.ADMIN_WRITE,
    };

    return permissions.map(
      (permission) => permissionToScopeMap[permission] || Scope.ADMIN_READ
    );
  }
}

export default new AuthController();
