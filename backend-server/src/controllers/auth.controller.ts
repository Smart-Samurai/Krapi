import { AdminRole, SessionType, Scope } from "@krapi/sdk";
import { Request, Response } from "express";

import { AuthService } from "../services/auth.service";
import { DatabaseService } from "../services/database.service";

import {
  ApiResponse,
  AdminUser,
  BackendProjectUser,
  AuthenticatedRequest,
} from "@/types";

/**
 * Authentication Controller
 *
 * Handles all authentication-related operations including:
 * - Admin and project session creation
 * - User login/logout
 * - Password management
 * - API key regeneration
 * - Session validation
 *
 * NOW USES BACKEND SDK FOR ALL OPERATIONS
 */
export class AuthController {
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

      if (!api_key) {
        res.status(400).json({
          success: false,
          error: "API key is required",
        } as ApiResponse);
        return;
      }

      // Use existing services directly
      const dbService = DatabaseService.getInstance();
      const authService = AuthService.getInstance();

      // Get admin user by API key
      const adminUser = await dbService.getAdminUserByApiKey(api_key);

      if (!adminUser || !adminUser.active) {
        res.status(401).json({
          success: false,
          error: "Invalid or inactive API key",
        } as ApiResponse);
        return;
      }

      // Create admin session with scopes
      const session = await authService.createAdminSessionWithScopes(adminUser);

      // Get scopes for the user's role
      const scopes = authService.getScopesForRole(adminUser.role as AdminRole);

      // Update login info
      await dbService.updateLoginInfo(adminUser.id);

      // Log the authentication action
      await authService.logAuthAction(
        "login",
        adminUser.id,
        undefined,
        session.id
      );

      // Return success response
      res.status(200).json({
        success: true,
        data: {
          session_token: session.token,
          expires_at: session.expires_at,
          scopes: scopes.map((scope) => scope.toString()),
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Create admin session error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Create project-specific session
   * POST /krapi/k1/auth/project/:projectId/session
   *
   * Creates a new project session token from valid project credentials.
   *
   * @param req - Request with projectId in params and credentials in body
   * @param res - Response with session token and expiration
   */
  createProjectSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: "Username and password are required",
        } as ApiResponse);
        return;
      }

      // Use existing services directly
      const dbService = DatabaseService.getInstance();
      const authService = AuthService.getInstance();

      // Authenticate project user
      const projectUser = await dbService.authenticateProjectUser(
        projectId,
        username,
        password
      );

      if (!projectUser) {
        res.status(401).json({
          success: false,
          error: "Invalid project credentials",
        } as ApiResponse);
        return;
      }

      // Create project session with scopes
      const session = await authService.createProjectSessionWithScopes(
        projectId,
        projectUser.permissions?.map((permission) => permission as Scope) || [] // Convert string to Scope enum
      );

      // Update login info
      await dbService.updateProjectUser(projectId, projectUser.id, {
        last_login: new Date().toISOString(),
      });

      // Log the authentication action
      await authService.logAuthAction(
        "login",
        projectUser.id,
        projectId,
        session.id
      );

      // Return success response
      res.status(200).json({
        success: true,
        data: {
          session_token: session.token,
          expires_at: session.expires_at,
          scopes:
            projectUser.permissions?.map((permission) => permission as Scope) ||
            [],
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Create project session error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Admin login with username and password
   * POST /krapi/k1/auth/admin/login
   *
   * Authenticates admin user and returns session information.
   *
   * @param req - Request with username and password in body
   * @param res - Response with user data and session token
   */
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

      // Use existing services directly for now
      const authService = AuthService.getInstance();
      const dbService = DatabaseService.getInstance();

      // Try to authenticate as admin user
      const adminUser = await authService.authenticateAdmin(username, password);

      if (!adminUser) {
        res.status(401).json({
          success: false,
          error: "Invalid credentials",
        } as ApiResponse);
        return;
      }

      // Create admin session with scopes
      const session = await authService.createAdminSessionWithScopes(adminUser);

      // Get scopes for the user's role
      const scopes = authService.getScopesForRole(adminUser.role as AdminRole);

      // Update login info
      await dbService.updateLoginInfo(adminUser.id);

      // Log the authentication action
      await authService.logAuthAction(
        "login",
        adminUser.id,
        undefined,
        session.id
      );

      // Return success response
      res.status(200).json({
        success: true,
        data: {
          user: {
            ...adminUser,
            scopes: scopes.map((scope) => scope.toString()),
          },
          token: session.token,
          session_token: session.token,
          expires_at: session.expires_at,
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Validate session token
   * POST /krapi/k1/auth/session/validate
   *
   * Validates a session token and returns session information.
   *
   * @param req - Request with token in body
   * @param res - Response with validation result
   */
  validateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: "Token is required",
        } as ApiResponse);
        return;
      }

      // Use existing services directly
      const authService = AuthService.getInstance();
      const dbService = DatabaseService.getInstance();

      // Validate the session
      const sessionResult = await authService.validateSessionToken(token);

      if (!sessionResult.valid || !sessionResult.session) {
        res.status(401).json({
          success: false,
          error: "Invalid or expired session",
        } as ApiResponse);
        return;
      }

      // Get user information based on session type
      let user: AdminUser | BackendProjectUser | undefined;
      let scopes: string[] = [];

      if (
        sessionResult.session.type === SessionType.ADMIN &&
        sessionResult.session.user_id
      ) {
        user = await dbService.getAdminUserById(sessionResult.session.user_id);
        if (user) {
          scopes = authService
            .getScopesForRole(user.role as AdminRole)
            .map((scope) => scope.toString());
        }
      } else if (
        sessionResult.session.type === SessionType.PROJECT &&
        sessionResult.session.project_id &&
        sessionResult.session.user_id
      ) {
        // For project sessions, we need to get the project user
        user = await dbService.getProjectUserById(
          sessionResult.session.user_id
        );
        if (user) {
          scopes = sessionResult.session.scopes.map((s) => s.toString());
        }
      }

      if (!user) {
        res.status(401).json({
          success: false,
          error: "User not found for session",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          session: sessionResult.session,
          user,
          scopes,
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Logout and invalidate session
   * POST /krapi/k1/auth/logout
   *
   * Logs out the current user and invalidates their session.
   *
   * @param req - Authenticated request
   * @param res - Response with success message
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get the session token from the request headers
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          error: "No valid session token provided",
        } as ApiResponse);
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Use existing services directly for now
      const dbService = DatabaseService.getInstance();
      const authService = AuthService.getInstance();

      // Invalidate the session
      const sessionInvalidated = await dbService.invalidateSession(token);

      if (sessionInvalidated) {
        // Log the logout action if we can get the user info
        try {
          const session = await dbService.getSessionByToken(token);
          if (session && session.user_id) {
            await authService.logAuthAction(
              "logout",
              session.user_id,
              undefined,
              session.id
            );
          }
        } catch (logError) {
          // Don't fail logout if logging fails
          console.warn("Failed to log logout action:", logError);
        }
      }

      res.status(200).json({
        success: true,
        data: undefined,
      } as ApiResponse);
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Get current authenticated user
   * GET /krapi/k1/auth/me
   *
   * Returns information about the currently authenticated user.
   *
   * @param req - Authenticated request
   * @param res - Response with user data
   */
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get the session token from the request headers
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          error: "No valid session token provided",
        } as ApiResponse);
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Use existing services directly for now
      const dbService = DatabaseService.getInstance();
      const authService = AuthService.getInstance();

      // Validate the session
      const sessionResult = await authService.validateSessionToken(token);

      if (!sessionResult.valid || !sessionResult.session) {
        res.status(401).json({
          success: false,
          error: "Invalid or expired session",
        } as ApiResponse);
        return;
      }

      // Get user information based on session type
      if (
        sessionResult.session.type === SessionType.ADMIN &&
        sessionResult.session.user_id
      ) {
        const adminUser = await dbService.getAdminUserById(
          sessionResult.session.user_id
        );
        if (!adminUser) {
          res.status(404).json({
            success: false,
            error: "User not found",
          } as ApiResponse);
          return;
        }

        // Get scopes for the user's role
        const scopes = authService.getScopesForRole(
          adminUser.role as AdminRole
        );

        res.status(200).json({
          success: true,
          data: {
            ...adminUser,
            scopes: scopes.map((scope) => scope.toString()),
          },
        } as ApiResponse);
      } else {
        res.status(400).json({
          success: false,
          error: "Unsupported session type",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Change user password
   * POST /krapi/k1/auth/change-password
   *
   * Changes the password for the current user.
   *
   * @param req - Authenticated request with current and new password
   * @param res - Response with success message
   */
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { current_password, new_password } = req.body;

      // Get service instances
      const dbService = DatabaseService.getInstance();
      const authService = AuthService.getInstance();

      // Validate current password
      const currentUser = await dbService.getAdminUserById(
        (req as AuthenticatedRequest).user?.id
      );
      if (!currentUser) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      // Verify current password
      const isValidPassword = await authService.verifyPassword(
        current_password,
        currentUser.password_hash
      );
      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          error: "Current password is incorrect",
        } as ApiResponse);
        return;
      }

      // Hash new password
      const newPasswordHash = await authService.hashPassword(new_password);

      // Update password in database
      await dbService.updateAdminUserPassword(currentUser.id, newPasswordHash);

      // Log the password change
      await authService.logAuthAction(
        "password_change",
        currentUser.id,
        undefined,
        (req as AuthenticatedRequest).session?.id
      );

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Admin login using API key
   * POST /krapi/k1/auth/admin/api-login
   *
   * Authenticates admin user using API key and returns session information.
   *
   * @param req - Request with api_key in body
   * @param res - Response with user data and session token
   */
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

      // Use existing services directly for now
      const dbService = DatabaseService.getInstance();
      const authService = AuthService.getInstance();

      // Get admin user by API key
      const adminUser = await dbService.getAdminUserByApiKey(api_key);

      if (!adminUser || !adminUser.active) {
        res.status(401).json({
          success: false,
          error: "Invalid or inactive API key",
        } as ApiResponse);
        return;
      }

      // Create admin session with scopes
      const session = await authService.createAdminSessionWithScopes(adminUser);

      // Get scopes for the user's role
      const scopes = authService.getScopesForRole(adminUser.role as AdminRole);

      // Update login info
      await dbService.updateLoginInfo(adminUser.id);

      // Log the authentication action
      await authService.logAuthAction(
        "login",
        adminUser.id,
        undefined,
        session.id
      );

      // Return success response
      res.status(200).json({
        success: true,
        data: {
          user: {
            ...adminUser,
            scopes: scopes.map((scope) => scope.toString()),
          },
          token: session.token,
          session_token: session.token,
          expires_at: session.expires_at,
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Admin API login error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Refresh session token
   * POST /krapi/k1/auth/refresh
   *
   * Refreshes the current session token if it's still valid.
   *
   * @param req - Authenticated request
   * @param res - Response with new session token and expiration
   */
  refreshSession = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get service instances
      const dbService = DatabaseService.getInstance();
      const authService = AuthService.getInstance();

      // Get current user
      const currentUser = await dbService.getAdminUserById(
        (req as AuthenticatedRequest).user?.id
      );
      if (!currentUser) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      // Create new session token
      const session = await authService.createAdminSessionWithScopes(
        currentUser
      );

      // Get scopes for the user's role
      const scopes = authService.getScopesForRole(
        currentUser.role as AdminRole
      );

      res.status(200).json({
        success: true,
        data: {
          session_token: session.token,
          expires_at: session.expires_at,
          scopes: scopes.map((scope) => scope.toString()),
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Refresh session error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Regenerate API key
   * POST /krapi/k1/auth/regenerate-api-key
   *
   * Regenerates the API key for the current user.
   *
   * @param req - Authenticated request
   * @param res - Response with new API key
   */
  regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get service instances
      const dbService = DatabaseService.getInstance();
      const authService = AuthService.getInstance();

      // Get current user
      const currentUser = await dbService.getAdminUserById(
        (req as AuthenticatedRequest).user?.id
      );
      if (!currentUser) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      // Generate new API key
      const newApiKey = authService.generateApiKey();

      // Update API key in database
      await dbService.updateAdminUserApiKey(currentUser.id, newApiKey);

      // Log the API key regeneration
      await authService.logAuthAction(
        "api_key_regenerated",
        currentUser.id,
        undefined,
        (req as AuthenticatedRequest).session?.id
      );

      res.status(200).json({
        success: true,
        data: {
          api_key: newApiKey,
          message: "API key regenerated successfully",
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Regenerate API key error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  private mapAdminPermissionsToScopes(permissions: string[]): string[] {
    const permissionToScopeMap: Record<string, string> = {
      "users.create": "ADMIN_WRITE",
      "users.read": "ADMIN_READ",
      "users.update": "ADMIN_WRITE",
      "users.delete": "ADMIN_WRITE",
      "projects.create": "PROJECTS_WRITE",
      "projects.read": "PROJECTS_READ",
      "projects.update": "PROJECTS_WRITE",
      "projects.delete": "PROJECTS_DELETE",
      "collections.create": "COLLECTIONS_WRITE",
      "collections.read": "COLLECTIONS_READ",
      "collections.write": "COLLECTIONS_WRITE",
      "collections.delete": "COLLECTIONS_DELETE",
      "storage.upload": "STORAGE_WRITE",
      "storage.read": "STORAGE_READ",
      "storage.delete": "STORAGE_DELETE",
      "settings.read": "ADMIN_READ",
      "settings.update": "ADMIN_WRITE",
    };

    return permissions.map(
      (permission) => permissionToScopeMap[permission] || "ADMIN_READ"
    );
  }
}

export default new AuthController();
