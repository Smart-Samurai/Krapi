import { Request, Response } from "express";
import { AuthService } from "@/services/auth.service";
import { DatabaseService } from "@/services/database.service";
import { AuthenticatedRequest, ApiResponse, SessionType } from "@/types";
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

      // This endpoint now uses API keys instead of a single master key
      const apiKey = await this.db.getApiKey(api_key);

      if (
        !apiKey ||
        !apiKey.is_active ||
        (apiKey.type !== "master" && apiKey.type !== "admin")
      ) {
        res.status(401).json({
          success: false,
          error: "Invalid API key",
        } as ApiResponse);
        return;
      }

      // Create session with API key scopes
      const session = await this.db.createSession({
        token: `tok_${uuidv4().replace(/-/g, "")}`,
        type: SessionType.ADMIN,
        user_id: apiKey.owner_id,
        scopes: apiKey.scopes,
        metadata: { api_key_id: apiKey.id },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
          session_token: session.token,
          expires_at: session.expires_at,
          scopes: session.scopes,
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

      const project = await this.db.getProjectByApiKey(api_key);

      if (!project || project.id !== projectId || !project.active) {
        res.status(401).json({
          success: false,
          error: "Invalid API key or project",
        } as ApiResponse);
        return;
      }

      // Create project session with default project scopes
      const session = await this.authService.createProjectSessionWithScopes(
        projectId
      );

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
          session_token: session.token,
          expires_at: session.expires_at,
          scopes: session.scopes,
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

  // Admin login
  adminLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;

      const user = await this.authService.authenticateAdmin(username, password);

      if (!user) {
        res.status(401).json({
          success: false,
          error: "Invalid credentials",
        } as ApiResponse);
        return;
      }

      // Create session with scopes based on role
      const session = await this.authService.createAdminSessionWithScopes(user);

      // Update last login
      await this.db.updateAdminUser(user.id, {
        last_login: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            access_level: user.access_level,
            permissions: user.permissions,
            scopes: session.scopes,
          },
          token: session.token,
          session_token: session.token,
          expires_at: session.expires_at,
        },
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to authenticate",
      } as ApiResponse);
      return;
    }
  };

  // Validate session (for checking if a session is still valid)
  validateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { session_token } = req.body;

      const session = await this.db.getSessionByToken(session_token);

      if (
        !session ||
        session.consumed ||
        new Date(session.expires_at) < new Date()
      ) {
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

      const apiKey = await this.db.getApiKey(api_key);

      if (!apiKey || !apiKey.is_active) {
        res.status(401).json({
          success: false,
          error: "Invalid or inactive API key",
        } as ApiResponse);
        return;
      }

      // Check if API key is expired
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        res.status(401).json({
          success: false,
          error: "API key expired",
        } as ApiResponse);
        return;
      }

      // Get the admin user
      const user = await this.db.getAdminUserById(apiKey.owner_id);

      if (!user || !user.active) {
        res.status(401).json({
          success: false,
          error: "User not found or inactive",
        } as ApiResponse);
        return;
      }

      // Create session with API key scopes
      const session = await this.db.createSession({
        token: `tok_${uuidv4().replace(/-/g, "")}`,
        type: SessionType.ADMIN,
        user_id: user.id,
        scopes: apiKey.scopes,
        metadata: { api_key_id: apiKey.id },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        consumed: false,
      });

      // Update last login
      await this.db.updateAdminUser(user.id, {
        last_login: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            access_level: user.access_level,
            permissions: user.permissions,
            scopes: apiKey.scopes,
          },
          token: session.token,
          session_token: session.token,
          expires_at: session.expires_at,
        },
      } as ApiResponse);
      return;
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
}

export default new AuthController();
