/**
 * Auth Service for BackendSDK
 *
 * Provides comprehensive authentication and session management functionality including:
 * - Admin and project user authentication
 * - Session creation and management
 * - Password hashing and validation
 * - API key authentication
 * - Token generation and validation
 */

import { DatabaseConnection, Logger } from "./core";
import { PasswordHashRow, EmailRow } from "./database-types";
import bcrypt from "bcryptjs";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  access_level: string;
  permissions: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  api_key?: string;
  login_count?: number;
}

export interface ProjectUser {
  id: string;
  project_id: string;
  username?: string;
  email?: string;
  external_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface Session {
  id: string;
  user_id: string;
  user_type: "admin" | "project";
  project_id?: string;
  token: string;
  scopes: string[];
  expires_at: string;
  created_at: string;
  last_used_at?: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
  project_id?: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  expires_at: string;
  user: AdminUser | ProjectUser;
  scopes: string[];
  session_id: string;
}

export interface ApiKeyAuthRequest {
  api_key: string;
}

export interface ApiKeyAuthResponse {
  success: boolean;
  token: string;
  expires_at: string;
  user: AdminUser | null;
  scopes: string[];
  session_id: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface PasswordResetRequest {
  email: string;
  reset_token?: string;
  new_password?: string;
}

export class AuthService {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  // Admin Authentication
  async authenticateAdmin(loginData: LoginRequest): Promise<LoginResponse> {
    try {
      const { username, email, password } = loginData;

      if (!username && !email) {
        throw new Error("Username or email is required");
      }

      if (!password) {
        throw new Error("Password is required");
      }

      // Get admin user by username or email
      let query = "SELECT * FROM admin_users WHERE is_active = true AND ";
      const params: unknown[] = [];

      if (username) {
        query += "username = $1";
        params.push(username);
      } else {
        query += "email = $1";
        params.push(email);
      }

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        throw new Error("Invalid credentials");
      }

      const adminUser = result.rows[0] as AdminUser;

      // Validate password
      const isValidPassword = await this.validatePassword(
        password,
        adminUser.password_hash
      );
      if (!isValidPassword) {
        throw new Error("Invalid credentials");
      }

      // Create session
      const session = await this.createSession({
        user_id: adminUser.id,
        user_type: "admin",
        scopes: adminUser.permissions,
        remember_me: loginData.remember_me ?? false,
      });

      // Update last login
      await this.updateLastLogin(adminUser.id, "admin");

      return {
        success: true,
        token: session.token,
        expires_at: session.expires_at,
        user: adminUser,
        scopes: session.scopes,
        session_id: session.id,
      };
    } catch (error) {
      this.logger.error("Admin authentication failed:", error);
      throw new Error("Authentication failed");
    }
  }

  async authenticateAdminWithApiKey(
    apiKeyData: ApiKeyAuthRequest
  ): Promise<ApiKeyAuthResponse> {
    try {
      const { api_key } = apiKeyData;

      if (!api_key) {
        throw new Error("API key is required");
      }

      // Get admin user by API key
      const result = await this.db.query(
        "SELECT * FROM admin_users WHERE api_key = $1 AND is_active = true",
        [api_key]
      );

      if (result.rows.length === 0) {
        throw new Error("Invalid API key");
      }

      const adminUser = result.rows[0] as AdminUser;

      // Create session
      const session = await this.createSession({
        user_id: adminUser.id,
        user_type: "admin",
        scopes: adminUser.permissions,
      });

      // Update last login
      await this.updateLastLogin(adminUser.id, "admin");

      return {
        success: true,
        token: session.token,
        expires_at: session.expires_at,
        user: adminUser,
        scopes: session.scopes,
        session_id: session.id,
      };
    } catch (error) {
      this.logger.error("API key authentication failed:", error);
      throw new Error("Authentication failed");
    }
  }

  // Project User Authentication
  async authenticateProjectUser(
    loginData: LoginRequest
  ): Promise<LoginResponse> {
    try {
      const { username, email, password, project_id } = loginData;

      if (!project_id) {
        throw new Error(
          "Project ID is required for project user authentication"
        );
      }

      if (!username && !email) {
        throw new Error("Username or email is required");
      }

      if (!password) {
        throw new Error("Password is required");
      }

      // Get project user by username/email and project
      let query =
        "SELECT * FROM project_users WHERE project_id = $1 AND is_active = true AND ";
      const params: unknown[] = [project_id];

      if (username) {
        query += "username = $2";
        params.push(username);
      } else {
        query += "email = $2";
        params.push(email);
      }

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        throw new Error("Invalid credentials");
      }

      const projectUser = result.rows[0] as ProjectUser;

      // Validate password (assuming project users also have password_hash)
      const userWithPassword = projectUser as ProjectUser & {
        password_hash: string;
      };
      const isValidPassword = await this.validatePassword(
        password,
        userWithPassword.password_hash
      );
      if (!isValidPassword) {
        throw new Error("Invalid credentials");
      }

      // Create session with project-specific scopes
      const session = await this.createSession({
        user_id: projectUser.id,
        user_type: "project",
        project_id,
        scopes: [
          "projects:read",
          "projects:write",
          "collections:read",
          "collections:write",
          "documents:read",
          "documents:write",
        ],
        remember_me: loginData.remember_me ?? false,
      });

      // Update last login
      await this.updateLastLogin(projectUser.id, "project");

      return {
        success: true,
        token: session.token,
        expires_at: session.expires_at,
        user: projectUser,
        scopes: session.scopes,
        session_id: session.id,
      };
    } catch (error) {
      this.logger.error("Project user authentication failed:", error);
      throw new Error("Authentication failed");
    }
  }

  // Session Management
  async createSession(sessionData: {
    user_id: string;
    user_type: "admin" | "project";
    project_id?: string;
    scopes: string[];
    remember_me?: boolean;
    ip_address?: string;
    user_agent?: string;
  }): Promise<Session> {
    try {
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date();

      // Set expiration based on remember_me
      if (sessionData.remember_me) {
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
      } else {
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour
      }

      const result = await this.db.query(
        `INSERT INTO sessions (user_id, user_type, project_id, token, scopes, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          sessionData.user_id,
          sessionData.user_type,
          sessionData.project_id,
          sessionToken,
          sessionData.scopes,
          expiresAt.toISOString(),
          sessionData.ip_address,
          sessionData.user_agent,
        ]
      );

      return result.rows[0] as Session;
    } catch (error) {
      this.logger.error("Failed to create session:", error);
      throw new Error("Failed to create session");
    }
  }

  async createSessionFromApiKey(apiKey: string): Promise<{
    session_token: string;
    expires_at: string;
    user_type: "admin" | "project";
    scopes: string[];
  }> {
    try {
      // First, find the API key and get user information
      const apiKeyResult = await this.db.query(
        `SELECT ak.*, au.username, au.role, au.permissions, au.id as user_id
         FROM api_keys ak
         JOIN admin_users au ON ak.owner_id = au.id
         WHERE ak.key = $1 AND ak.is_active = true AND ak.expires_at > CURRENT_TIMESTAMP`,
        [apiKey]
      );

      if (apiKeyResult.rows.length === 0) {
        throw new Error("Invalid or expired API key");
      }

      const apiKeyData = apiKeyResult.rows[0] as {
        user_id: string;
        scopes?: string[];
        permissions?: string[];
      };
      const userType: "admin" | "project" = "admin"; // API keys are admin-only for now

      // Create a new session
      const session = await this.createSession({
        user_id: apiKeyData.user_id,
        user_type: userType,
        scopes: apiKeyData.scopes || apiKeyData.permissions || [],
        remember_me: false,
      });

      return {
        session_token: session.token,
        expires_at: session.expires_at,
        user_type: userType,
        scopes: session.scopes,
      };
    } catch (error) {
      this.logger.error("Failed to create session from API key", error);
      throw new Error("Failed to create session from API key");
    }
  }

  async validateSession(token: string): Promise<Session | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM sessions 
         WHERE token = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0] as Session;

      // Update last used timestamp
      await this.db.query(
        "UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1",
        [session.id]
      );

      return session;
    } catch (error) {
      this.logger.error("Failed to validate session:", error);
      return null;
    }
  }

  async revokeSession(token: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        "UPDATE sessions SET is_active = false WHERE token = $1",
        [token]
      );
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to revoke session:", error);
      throw new Error("Failed to revoke session");
    }
  }

  async revokeAllUserSessions(
    userId: string,
    userType: "admin" | "project"
  ): Promise<number> {
    try {
      const result = await this.db.query(
        "UPDATE sessions SET is_active = false WHERE user_id = $1 AND user_type = $2",
        [userId, userType]
      );
      return result.rowCount;
    } catch (error) {
      this.logger.error("Failed to revoke user sessions:", error);
      throw new Error("Failed to revoke user sessions");
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.db.query(
        "UPDATE sessions SET is_active = false WHERE expires_at <= CURRENT_TIMESTAMP AND is_active = true"
      );
      return result.rowCount;
    } catch (error) {
      this.logger.error("Failed to cleanup expired sessions:", error);
      throw new Error("Failed to cleanup expired sessions");
    }
  }

  // Password Management
  async changePassword(
    userId: string,
    userType: "admin" | "project",
    passwordData: PasswordChangeRequest
  ): Promise<boolean> {
    try {
      const { current_password, new_password } = passwordData;

      // Get current user
      const table = userType === "admin" ? "admin_users" : "project_users";
      const result = await this.db.query(
        `SELECT password_hash FROM ${table} WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      const currentPasswordHash = (result.rows[0] as PasswordHashRow)
        .password_hash;

      // Validate current password
      const isValidPassword = await this.validatePassword(
        current_password,
        currentPasswordHash
      );
      if (!isValidPassword) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(new_password);

      // Update password
      const updateResult = await this.db.query(
        `UPDATE ${table} SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [newPasswordHash, userId]
      );

      return updateResult.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to change password:", error);
      throw new Error("Failed to change password");
    }
  }

  async resetPassword(
    resetData: PasswordResetRequest
  ): Promise<{ success: boolean; reset_token?: string }> {
    try {
      if (!resetData.reset_token) {
        // Generate and send reset token
        const resetToken = this.generateResetToken();

        // Store reset token (you might want to add a password_resets table)
        await this.db.query(
          `INSERT INTO password_resets (email, reset_token, expires_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (email) DO UPDATE SET reset_token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
          [resetData.email, resetToken, new Date(Date.now() + 3600000)] // 1 hour expiry
        );

        return { success: true, reset_token: resetToken };
      } else {
        // Validate reset token and update password
        if (!resetData.new_password) {
          throw new Error("New password is required");
        }

        const result = await this.db.query(
          `SELECT email FROM password_resets 
           WHERE reset_token = $1 AND expires_at > CURRENT_TIMESTAMP`,
          [resetData.reset_token]
        );

        if (result.rows.length === 0) {
          throw new Error("Invalid or expired reset token");
        }

        const email = (result.rows[0] as EmailRow).email;
        const newPasswordHash = await this.hashPassword(resetData.new_password);

        // Update password in admin_users table
        await this.db.query(
          "UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2",
          [newPasswordHash, email]
        );

        // Remove used reset token
        await this.db.query(
          "DELETE FROM password_resets WHERE reset_token = $1",
          [resetData.reset_token]
        );

        return { success: true };
      }
    } catch (error) {
      this.logger.error("Failed to reset password:", error);
      throw new Error("Failed to reset password");
    }
  }

  // Utility Methods
  private async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch {
      // Fallback for development
      return `hashed_${password}`;
    }
  }

  private async validatePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      // Fallback for development
      return `hashed_${password}` === hash;
    }
  }

  private generateSessionToken(): string {
    return `st_${Math.random().toString(36).substring(2, 15)}${Math.random()
      .toString(36)
      .substring(2, 15)}${Date.now()}`;
  }

  private generateResetToken(): string {
    return `rt_${Math.random().toString(36).substring(2, 15)}${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  }

  private async updateLastLogin(
    userId: string,
    userType: "admin" | "project"
  ): Promise<void> {
    try {
      const table = userType === "admin" ? "admin_users" : "project_users";
      await this.db.query(
        `UPDATE ${table} SET last_login = CURRENT_TIMESTAMP, login_count = COALESCE(login_count, 0) + 1 WHERE id = $1`,
        [userId]
      );
    } catch (error) {
      this.logger.error("Failed to update last login:", error);
      // Don't throw here as this shouldn't break the main authentication flow
    }
  }

  // Session queries
  async getSessionById(sessionId: string): Promise<Session | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM sessions WHERE id = $1",
        [sessionId]
      );
      return result.rows.length > 0 ? (result.rows[0] as Session) : null;
    } catch (error) {
      this.logger.error("Failed to get session by ID:", error);
      return null;
    }
  }

  async getUserSessions(
    userId: string,
    userType: "admin" | "project"
  ): Promise<Session[]> {
    try {
      const result = await this.db.query(
        "SELECT * FROM sessions WHERE user_id = $1 AND user_type = $2 AND is_active = true ORDER BY created_at DESC",
        [userId, userType]
      );
      return result.rows as Session[];
    } catch (error) {
      this.logger.error("Failed to get user sessions:", error);
      throw new Error("Failed to get user sessions");
    }
  }
}
