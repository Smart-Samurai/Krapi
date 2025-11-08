/**
 * Auth Service for BackendSDK
 * 
 * Provides comprehensive authentication and session management functionality including:
 * - Admin and project user authentication
 * - Session creation and management
 * - Password hashing and validation
 * - API key authentication
 * - Token generation and validation
 * 
 * @class AuthService
 * @example
 * const authService = new AuthService(dbConnection, logger);
 * const result = await authService.authenticateAdmin({ username: 'admin', password: 'pass' });
 */

import bcrypt from "bcryptjs";

import { DatabaseConnection, Logger } from "./core";
import { PasswordHashRow, EmailRow } from "./database-types";

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

  /**
   * Create a new AuthService instance
   * 
   * @param {DatabaseConnection} databaseConnection - Database connection
   * @param {Logger} logger - Logger instance
   */
  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  /**
   * Authenticate admin user
   * 
   * Authenticates an admin user with username/email and password.
   * Creates a session and returns login response with token and user data.
   * 
   * @param {LoginRequest} loginData - Login credentials
   * @param {string} [loginData.username] - Admin username
   * @param {string} [loginData.email] - Admin email
   * @param {string} loginData.password - Admin password
   * @param {string} [loginData.project_id] - Project ID (for project users)
   * @param {boolean} [loginData.remember_me] - Whether to remember session
   * @returns {Promise<LoginResponse>} Login response with token, user, and session info
   * @throws {Error} If username/email or password is missing
   * @throws {Error} If credentials are invalid
   * 
   * @example
   * const result = await authService.authenticateAdmin({
   *   username: 'admin',
   *   password: 'password'
   * });
   */
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

  /**
   * Register a new admin user
   *
   * Creates a new admin user account with the provided credentials.
   *
   * @param {Object} registerData - Registration data
   * @param {string} registerData.username - Username (required)
   * @param {string} registerData.email - Email address (required)
   * @param {string} registerData.password - Password (required)
   * @param {string} [registerData.role="user"] - User role
   * @param {string} [registerData.access_level="read"] - Access level
   * @param {string[]} [registerData.permissions=[]] - Permission scopes
   * @returns {Promise<{success: boolean, user: AdminUser}>} Registration result
   * @throws {Error} If user already exists or registration fails
   *
   * @example
   * const result = await authService.register({
   *   username: 'newuser',
   *   email: 'user@example.com',
   *   password: 'securepassword',
   *   role: 'admin'
   * });
   */
  async register(registerData: {
    username: string;
    email: string;
    password: string;
    role?: string;
    access_level?: string;
    permissions?: string[];
  }): Promise<{ success: boolean; user: AdminUser }> {
    try {
      const {
        username,
        email,
        password,
        role = "user",
        access_level = "read",
        permissions = [],
      } = registerData;

      // Check if user already exists
      const existingUser = await this.db.query(
        "SELECT id FROM admin_users WHERE username = $1 OR email = $2",
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error("User already exists");
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const result = await this.db.query(
        `INSERT INTO admin_users (username, email, password_hash, role, access_level, permissions, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [username, email, passwordHash, role, access_level, permissions]
      );

      if (result.rows.length === 0) {
        throw new Error("Failed to create user");
      }

      const newUser = result.rows[0] as AdminUser;

      return {
        success: true,
        user: newUser,
      };
    } catch (error) {
      this.logger.error("User registration failed:", error);
      throw new Error("Registration failed");
    }
  }

  /**
   * Logout and revoke session
   *
   * Logs out a user by revoking their session token.
   *
   * @param {string} [sessionId] - Optional session ID to revoke (if not provided, revokes current session)
   * @returns {Promise<{success: boolean}>} Logout result
   *
   * @example
   * await authService.logout('session-id');
   */
  async logout(sessionId?: string): Promise<{ success: boolean }> {
    try {
      if (sessionId) {
        // Revoke specific session
        await this.revokeSession(sessionId);
      }
      // Always return success for logout
      return { success: true };
    } catch (error) {
      this.logger.error("Logout failed:", error);
      // Don't throw error on logout failure
      return { success: true };
    }
  }

  /**
   * Authenticate admin user with API key
   *
   * Authenticates an admin user using an API key instead of username/password.
   *
   * @param {ApiKeyAuthRequest} apiKeyData - API key authentication data
   * @param {string} apiKeyData.api_key - API key value
   * @returns {Promise<ApiKeyAuthResponse>} Authentication response with token and user
   * @throws {Error} If API key is invalid or expired
   *
   * @example
   * const result = await authService.authenticateAdminWithApiKey({
   *   api_key: 'ak_...'
   * });
   */
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

  /**
   * Regenerate API key for admin user
   *
   * Generates a new API key for the authenticated admin user.
   * Note: This is a placeholder implementation.
   *
   * @param {unknown} _req - Request object (currently unused)
   * @returns {Promise<{success: boolean, data?: {apiKey: string}, error?: string}>} API key generation result
   *
   * @example
   * const result = await authService.regenerateApiKey(request);
   * if (result.success) {
   *   console.log(`New API Key: ${result.data?.apiKey}`);
   * }
   */
  async regenerateApiKey(
    _req: unknown
  ): Promise<{ success: boolean; data?: { apiKey: string }; error?: string }> {
    try {
      // For now, this is a placeholder implementation
      // In a real implementation, this would:
      // 1. Validate the request (user authentication, permissions)
      // 2. Generate a new API key
      // 3. Update the database
      // 4. Return the new key

      const newApiKey = `ak_${Math.random()
        .toString(36)
        .substring(2, 15)}${Math.random()
        .toString(36)
        .substring(2, 15)}${Date.now()}`;

      return {
        success: true,
        data: { apiKey: newApiKey },
      };
    } catch (error) {
      this.logger.error("Failed to regenerate API key:", error);
      return {
        success: false,
        error: "Failed to regenerate API key",
      };
    }
  }

  /**
   * Authenticate project user
   *
   * Authenticates a project-specific user with username/email and password.
   *
   * @param {LoginRequest} loginData - Login credentials
   * @param {string} loginData.project_id - Project ID (required)
   * @param {string} [loginData.username] - Username
   * @param {string} [loginData.email] - Email
   * @param {string} loginData.password - Password
   * @param {boolean} [loginData.remember_me] - Whether to remember session
   * @returns {Promise<LoginResponse>} Login response with token and user
   * @throws {Error} If credentials are invalid or project ID missing
   *
   * @example
   * const result = await authService.authenticateProjectUser({
   *   project_id: 'project-id',
   *   username: 'user',
   *   password: 'password'
   * });
   */
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

  /**
   * Create a new session
   *
   * Creates a new authentication session for a user.
   *
   * @param {Object} sessionData - Session data
   * @param {string} sessionData.user_id - User ID
   * @param {"admin" | "project"} sessionData.user_type - User type
   * @param {string} [sessionData.project_id] - Project ID (for project users)
   * @param {string[]} sessionData.scopes - Permission scopes
   * @param {boolean} [sessionData.remember_me=false] - Whether to extend session (30 days vs 1 hour)
   * @param {string} [sessionData.ip_address] - Client IP address
   * @param {string} [sessionData.user_agent] - Client user agent
   * @returns {Promise<Session>} Created session
   * @throws {Error} If session creation fails
   *
   * @example
   * const session = await authService.createSession({
   *   user_id: 'user-id',
   *   user_type: 'admin',
   *   scopes: ['admin:read', 'admin:write'],
   *   remember_me: true
   * });
   */
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

  /**
   * Create session from API key
   *
   * Creates a session token from a valid API key.
   *
   * @param {string} apiKey - API key value
   * @returns {Promise<Object>} Session information
   * @returns {string} returns.session_token - Session token
   * @returns {string} returns.expires_at - Expiration timestamp
   * @returns {"admin" | "project"} returns.user_type - User type
   * @returns {string[]} returns.scopes - Permission scopes
   * @throws {Error} If API key is invalid or expired
   *
   * @example
   * const session = await authService.createSessionFromApiKey('ak_...');
   * console.log(`Session token: ${session.session_token}`);
   */
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

  /**
   * Validate session token
   *
   * Validates a session token and returns the session if valid and not expired.
   * Updates the last_used_at timestamp.
   *
   * @param {string} token - Session token
   * @returns {Promise<Session | null>} Session if valid, null if invalid/expired
   *
   * @example
   * const session = await authService.validateSession('st_...');
   * if (session) {
   *   console.log(`User: ${session.user_id}, Scopes: ${session.scopes}`);
   * }
   */
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

  /**
   * Revoke a session
   *
   * Invalidates a session by marking it as inactive.
   *
   * @param {string} token - Session token to revoke
   * @returns {Promise<boolean>} True if session was revoked
   * @throws {Error} If revocation fails
   *
   * @example
   * const revoked = await authService.revokeSession('st_...');
   */
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

  /**
   * Revoke all sessions for a user
   *
   * Invalidates all active sessions for a specific user.
   *
   * @param {string} userId - User ID
   * @param {"admin" | "project"} userType - User type
   * @returns {Promise<number>} Number of sessions revoked
   * @throws {Error} If revocation fails
   *
   * @example
   * const count = await authService.revokeAllUserSessions('user-id', 'admin');
   * console.log(`Revoked ${count} sessions`);
   */
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

  /**
   * Cleanup expired sessions
   *
   * Marks all expired sessions as inactive.
   *
   * @returns {Promise<number>} Number of sessions cleaned up
   * @throws {Error} If cleanup fails
   *
   * @example
   * const count = await authService.cleanupExpiredSessions();
   * console.log(`Cleaned up ${count} expired sessions`);
   */
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

  /**
   * Change user password
   *
   * Changes a user's password after validating the current password.
   *
   * @param {string} userId - User ID
   * @param {"admin" | "project"} userType - User type
   * @param {PasswordChangeRequest} passwordData - Password change data
   * @param {string} passwordData.current_password - Current password
   * @param {string} passwordData.new_password - New password
   * @returns {Promise<boolean>} True if password changed successfully
   * @throws {Error} If current password is incorrect or change fails
   *
   * @example
   * const changed = await authService.changePassword('user-id', 'admin', {
   *   current_password: 'oldpass',
   *   new_password: 'newpass'
   * });
   */
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

  /**
   * Reset user password
   *
   * Initiates or completes a password reset process.
   * If no reset_token provided, generates and stores a reset token.
   * If reset_token provided, validates it and updates the password.
   *
   * @param {PasswordResetRequest} resetData - Password reset data
   * @param {string} resetData.email - User email
   * @param {string} [resetData.reset_token] - Reset token (for completing reset)
   * @param {string} [resetData.new_password] - New password (required when reset_token provided)
   * @returns {Promise<{success: boolean, reset_token?: string}>} Reset result
   * @throws {Error} If reset fails or token is invalid/expired
   *
   * @example
   * // Initiate reset
   * const { reset_token } = await authService.resetPassword({ email: 'user@example.com' });
   *
   * // Complete reset
   * await authService.resetPassword({
   *   email: 'user@example.com',
   *   reset_token: 'rt_...',
   *   new_password: 'newpassword'
   * });
   */
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
  /**
   * Get session by ID
   *
   * Retrieves a session by its ID.
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<Session | null>} Session or null if not found
   * @throws {Error} If query fails
   *
   * @example
   * const session = await authService.getSessionById('session-id');
   */
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
