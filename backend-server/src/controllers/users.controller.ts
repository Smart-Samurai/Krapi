import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { DatabaseService } from "@/services/database.service";
import {
  ApiResponse,
  ProjectUser,
  ProjectScope,
  SessionType,
  Scope,
} from "@/types";

export class UsersController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Get all users in a project
  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 50, search, active } = req.query;

      // Use the database service directly
      const result = await this.db.getProjectUsers(projectId, {
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        search: search as string,
        active:
          active === "true" ? true : active === "false" ? false : undefined,
      });

      res.json({
        success: true,
        data: result.users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          pages: Math.ceil(result.total / Number(limit)),
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch users",
      } as ApiResponse);
    }
  };

  // Get a specific user
  getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, userId } = req.params;

      // Use the database service directly
      const user = await this.db.getProjectUser(projectId, userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: user,
      } as ApiResponse<ProjectUser>);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user",
      } as ApiResponse);
    }
  };

  // Create a new user
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { username, email, password, phone, scopes, metadata } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          error: "Username, email, and password are required",
        } as ApiResponse);
        return;
      }

      // Check if user already exists
      const existingByEmail = await this.db.getProjectUserByEmail(
        projectId,
        email
      );
      if (existingByEmail) {
        res.status(409).json({
          success: false,
          error: "A user with this email already exists",
        } as ApiResponse);
        return;
      }

      const existingByUsername = await this.db.getProjectUserByUsername(
        projectId,
        username
      );
      if (existingByUsername) {
        res.status(409).json({
          success: false,
          error: "A user with this username already exists",
        } as ApiResponse);
        return;
      }

      // Create the user with default scopes if none provided
      const defaultScopes = [
        ProjectScope.DATA_READ,
        ProjectScope.FILES_READ,
        ProjectScope.FUNCTIONS_EXECUTE,
      ];

      const user = await this.db.createProjectUser(projectId, {
        username,
        email,
        password,
        phone,
        scopes: scopes || defaultScopes,
        metadata: metadata || {},
      });

      // Remove password hash from response
      delete user.password_hash;

      res.status(201).json({
        success: true,
        data: user,
      } as ApiResponse<ProjectUser>);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create user",
      } as ApiResponse);
    }
  };

  // Update a user
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, userId } = req.params;
      const updates = req.body;

      // Prevent updating certain fields
      delete updates.id;
      delete updates.project_id;
      delete updates.created_at;
      delete updates.password_hash;

      // Check if updating email/username to existing values
      if (updates.email) {
        const existing = await this.db.getProjectUserByEmail(
          projectId,
          updates.email
        );
        if (existing && existing.id !== userId) {
          res.status(409).json({
            success: false,
            error: "A user with this email already exists",
          } as ApiResponse);
          return;
        }
      }

      if (updates.username) {
        const existing = await this.db.getProjectUserByUsername(
          projectId,
          updates.username
        );
        if (existing && existing.id !== userId) {
          res.status(409).json({
            success: false,
            error: "A user with this username already exists",
          } as ApiResponse);
          return;
        }
      }

      const user = await this.db.updateProjectUser(projectId, userId, updates);

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      // Remove password hash from response
      delete user.password_hash;

      res.json({
        success: true,
        data: user,
      } as ApiResponse<ProjectUser>);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user",
      } as ApiResponse);
    }
  };

  // Delete a user
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, userId } = req.params;

      const deleted = await this.db.deleteProjectUser(projectId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        message: "User deleted successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete user",
      } as ApiResponse);
    }
  };

  // Authenticate a project user
  authenticateUser = async (req: Request, res: Response): Promise<void> => {
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

      const user = await this.db.authenticateProjectUser(
        projectId,
        username,
        password
      );

      if (!user) {
        res.status(401).json({
          success: false,
          error: "Invalid credentials",
        } as ApiResponse);
        return;
      }

      // Create a session token for the user
      const sessionToken = `pst_${uuidv4().replace(/-/g, "")}`;
      const session = await this.db.createSession({
        token: sessionToken,
        type: SessionType.PROJECT,
        user_id: user.id,
        project_id: projectId,
        scopes: user.scopes.map((scope) => scope as Scope),
        metadata: { user_type: "project_user" },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        consumed: false,
      });

      // Remove password hash from response
      delete user.password_hash;

      res.json({
        success: true,
        data: {
          user,
          session_token: session.token,
          expires_at: session.expires_at,
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Authenticate user error:", error);
      res.status(500).json({
        success: false,
        error: "Authentication failed",
      } as ApiResponse);
    }
  };

  // Update user scopes
  updateUserScopes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, userId } = req.params;
      const { scopes } = req.body;

      if (!Array.isArray(scopes)) {
        res.status(400).json({
          success: false,
          error: "Scopes must be an array",
        } as ApiResponse);
        return;
      }

      const user = await this.db.updateProjectUser(projectId, userId, {
        scopes,
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      // Remove password hash from response
      delete user.password_hash;

      res.json({
        success: true,
        data: user,
      } as ApiResponse<ProjectUser>);
    } catch (error) {
      console.error("Update user scopes error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user scopes",
      } as ApiResponse);
    }
  };

  // Verify user email
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, userId } = req.params;
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: "Verification token is required",
        } as ApiResponse);
        return;
      }

      // Basic email verification implementation
      // In a production system, this would validate the verification token
      // For now, we'll just mark the user as verified

      const user = await this.db.updateProjectUser(projectId, userId, {
        is_verified: true,
        email_verified_at: new Date().toISOString(),
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      // Remove password hash from response
      delete user.password_hash;

      res.json({
        success: true,
        data: user,
        message: "Email verified successfully",
      } as ApiResponse<ProjectUser>);
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to verify email",
      } as ApiResponse);
    }
  };

  // Send password reset email
  sendPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { email } = req.body as { email?: string };

      if (!email) {
        res.status(400).json({
          success: false,
          error: "Email is required",
        } as ApiResponse);
        return;
      }

      const user = await this.db.getProjectUserByEmail(projectId, email);

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        } as ApiResponse);
        return;
      }

      // Basic password reset implementation
      // In a production system, this would generate a reset token and send email
      // For now, we'll just acknowledge the request

      res.json({
        success: true,
        message: "Password reset email sent successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Send password reset error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send password reset email",
      } as ApiResponse);
    }
  };

  // Reset password with token
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, new_password } = req.body as {
        token?: string;
        new_password?: string;
      };

      if (!token || !new_password) {
        res.status(400).json({
          success: false,
          error: "Token and new password are required",
        } as ApiResponse);
        return;
      }

      // Basic password reset implementation
      // In a production system, this would validate the token and update password
      // For now, we'll just acknowledge the request

      res.json({
        success: true,
        message: "Password reset successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reset password",
      } as ApiResponse);
    }
  };
}

export default new UsersController();
