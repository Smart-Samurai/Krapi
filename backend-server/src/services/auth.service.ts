import crypto from "crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// UUID import removed - not used
import { DatabaseService } from "./database.service";

import {
  AdminUser,
  AdminRole,
  SessionType,
  Scope,
  BackendSession,
} from "@/types";

/**
 * Authentication Service
 * 
 * Singleton service that handles all authentication and authorization logic:
 * - Password hashing and verification
 * - JWT token generation and validation
 * - Session management
 * - Scope-based permissions
 * - API key generation
 * - Authentication logging
 * 
 * Uses bcrypt for password hashing and jsonwebtoken for JWT operations.
 * 
 * @class AuthService
 * @example
 * const authService = AuthService.getInstance();
 * const user = await authService.authenticateAdmin('username', 'password');
 * const session = await authService.createAdminSessionWithScopes(user);
 */
export class AuthService {
  private static instance: AuthService;
  private db: DatabaseService;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private sessionExpiresIn: number;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.jwtSecret = process.env.JWT_SECRET || "default-secret-change-this";
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
    this.sessionExpiresIn = this.parseSessionDuration(
      process.env.SESSION_EXPIRES_IN || "1h"
    );
  }

  /**
   * Get singleton instance of AuthService
   * 
   * @returns {AuthService} AuthService instance
   * 
   * @example
   * const authService = AuthService.getInstance();
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Parse session duration string to milliseconds
   * Supports formats: 1h (hours), 1d (days), 30m (minutes)
   *
   * @param duration - Duration string (e.g., '1h', '7d', '30m')
   * @returns Duration in milliseconds
   */
  private parseSessionDuration(duration: string): number {
    const match = duration.match(/^(\d+)([hmd])$/);
    if (!match) return 3600000; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      case "m":
        return value * 60 * 1000;
      default:
        return 3600000;
    }
  }

  /**
   * Authenticate admin user with username and password
   * 
   * @param {string} username - Admin username
   * @param {string} password - Admin password
   * @returns {Promise<AdminUser | null>} Admin user if authentication succeeds, null otherwise
   * 
   * @example
   * const user = await authService.authenticateAdmin('admin', 'password');
   * if (user) {
   *   console.log('Authentication successful');
   * }
   */
  async authenticateAdmin(
    username: string,
    password: string
  ): Promise<AdminUser | null> {
    const user = await this.db.getAdminUserByUsername(username);
    if (!user || !user.active) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    // Update last login
    this.db.updateAdminUser(user.id, { last_login: new Date().toISOString() });

    return user;
  }

  /**
   * Get scopes for a given admin role
   * 
   * Returns the list of scopes/permissions associated with an admin role.
   * 
   * @param {AdminRole | string} role - Admin role (MASTER_ADMIN, ADMIN, PROJECT_ADMIN, DEVELOPER)
   * @returns {Scope[]} Array of scopes for the role
   * 
   * @example
   * const scopes = authService.getScopesForRole(AdminRole.ADMIN);
   * // Returns: [ADMIN_READ, ADMIN_WRITE, PROJECTS_READ, ...]
   */
  getScopesForRole(role: AdminRole | string): Scope[] {
    // Handle both enum values and string values for backward compatibility
    const roleString = typeof role === 'string' ? role : String(role);
    
    switch (roleString) {
      case AdminRole.MASTER_ADMIN:
      case "master_admin":
        return [Scope.MASTER]; // Master scope includes everything

      case AdminRole.ADMIN:
      case "admin":
        return [
          Scope.ADMIN_READ,
          Scope.ADMIN_WRITE,
          Scope.PROJECTS_READ,
          Scope.PROJECTS_WRITE,
          Scope.PROJECTS_DELETE,
          Scope.COLLECTIONS_READ,
          Scope.COLLECTIONS_WRITE,
          Scope.COLLECTIONS_DELETE,
          Scope.DOCUMENTS_READ,
          Scope.DOCUMENTS_WRITE,
          Scope.DOCUMENTS_DELETE,
          Scope.STORAGE_READ,
          Scope.STORAGE_WRITE,
          Scope.STORAGE_DELETE,
          Scope.EMAIL_SEND,
          Scope.EMAIL_READ,
          Scope.FUNCTIONS_EXECUTE,
          Scope.FUNCTIONS_WRITE,
          Scope.FUNCTIONS_DELETE,
        ];

      case AdminRole.PROJECT_ADMIN:
      case "project_admin":
        return [
          Scope.PROJECTS_READ,
          Scope.COLLECTIONS_READ,
          Scope.COLLECTIONS_WRITE,
          Scope.DOCUMENTS_READ,
          Scope.DOCUMENTS_WRITE,
          Scope.STORAGE_READ,
          Scope.STORAGE_WRITE,
          Scope.EMAIL_SEND,
          Scope.FUNCTIONS_EXECUTE,
          Scope.FUNCTIONS_WRITE,
        ];

      default:
        return [];
    }
  }

  /**
   * Get default scopes for project API keys
   * 
   * Returns the default set of scopes assigned to project API keys.
   * 
   * @returns {Scope[]} Array of default project scopes
   * 
   * @example
   * const scopes = authService.getDefaultProjectScopes();
   * // Returns: [COLLECTIONS_READ, DOCUMENTS_READ, DOCUMENTS_WRITE, ...]
   */
  getDefaultProjectScopes(): Scope[] {
    return [
      Scope.COLLECTIONS_READ,
      Scope.DOCUMENTS_READ,
      Scope.DOCUMENTS_WRITE,
      Scope.STORAGE_READ,
      Scope.STORAGE_WRITE,
      Scope.EMAIL_SEND,
      Scope.FUNCTIONS_EXECUTE,
    ];
  }

  /**
   * Create admin session with appropriate scopes
   * 
   * Creates a new session for an admin user with scopes based on their role.
   * Session expires in 24 hours.
   * 
   * @param {AdminUser} adminUser - Admin user to create session for
   * @returns {Promise<BackendSession>} Created session
   * 
   * @example
   * const session = await authService.createAdminSessionWithScopes(adminUser);
   * console.log('Session token:', session.token);
   */
  async createAdminSessionWithScopes(
    adminUser: AdminUser
  ): Promise<BackendSession> {
    const scopes = this.getScopesForRole(adminUser.role);

    const session = await this.db.createSession({
      token: this.generateSecureToken(),
      type: SessionType.ADMIN,
      user_id: adminUser.id,
      scopes,
      is_active: true,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      consumed: false,
    });

    return session;
  }

  /**
   * Create project session with appropriate scopes
   * 
   * Creates a new session for a project with specified scopes or default project scopes.
   * Session expires in 24 hours.
   * 
   * @param {string} projectId - Project ID
   * @param {Scope[]} [scopes] - Optional scopes (uses default project scopes if not provided)
   * @returns {Promise<BackendSession>} Created session
   * @throws {Error} If project is not found or inactive
   * 
   * @example
   * const session = await authService.createProjectSessionWithScopes('project-id');
   * // Or with custom scopes:
   * const session = await authService.createProjectSessionWithScopes('project-id', [Scope.DOCUMENTS_READ]);
   */
  async createProjectSessionWithScopes(
    projectId: string,
    scopes?: Scope[]
  ): Promise<BackendSession> {
    const project = await this.db.getProjectById(projectId);
    if (!project || !project.active) {
      throw new Error("Project not found or inactive");
    }

    const sessionScopes = scopes || this.getDefaultProjectScopes();

    const session = await this.db.createSession({
      token: this.generateSecureToken(),
      type: SessionType.PROJECT,
      user_id: "project-user", // Placeholder user ID for project sessions
      project_id: projectId,
      scopes: sessionScopes,
      is_active: true,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      consumed: false,
    });

    return session;
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(): string {
    return `tok_${crypto.randomBytes(32).toString("hex")}`;
  }

  /**
   * Validate session token (without consuming)
   * 
   * Validates a session token and returns session information if valid.
   * Updates last activity timestamp for valid sessions.
   * 
   * @param {string} token - Session token to validate
   * @returns {Promise<Object>} Validation result
   * @returns {boolean} returns.valid - Whether session is valid
   * @returns {BackendSession} [returns.session] - Session data if valid
   * 
   * @example
   * const result = await authService.validateSessionToken('session-token');
   * if (result.valid) {
   *   console.log('Session valid:', result.session);
   * }
   */
  async validateSessionToken(
    token: string
  ): Promise<{ valid: boolean; session?: BackendSession }> {
    const session = await this.db.getSessionByToken(token);

    if (!session) {
      return { valid: false };
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      // Mark expired session as consumed and update last activity
      await this.db.updateSession(session.id, {
        consumed: true,
        last_activity: true,
      });
      return { valid: false };
    }

    // Check if already consumed
    if (session.consumed) {
      return { valid: false };
    }

    // Update last activity for valid session
    const updatedSession = await this.db.updateSession(session.id, {
      last_activity: true,
    });

    return { valid: true, session: updatedSession || session };
  }

  /**
   * Generate JWT token
   * 
   * Generates a JWT token with the specified payload.
   * Token expiration is configured via JWT_EXPIRES_IN environment variable (default: 7d).
   * 
   * @param {Object} payload - JWT payload
   * @param {string} payload.id - User/session ID
   * @param {SessionType} payload.type - Session type
   * @param {string} [payload.projectId] - Project ID (for project sessions)
   * @param {string[]} [payload.permissions] - User permissions
   * @returns {string} JWT token
   * 
   * @example
   * const token = authService.generateJWT({
   *   id: 'user-id',
   *   type: SessionType.ADMIN,
   *   permissions: ['admin:read']
   * });
   */
  generateJWT(payload: {
    id: string;
    type: SessionType;
    projectId?: string;
    permissions?: string[];
  }): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   * 
   * Verifies and decodes a JWT token.
   * 
   * @param {string} token - JWT token to verify
   * @returns {Object | null} Decoded token payload or null if invalid
   * @returns {string} returns.id - User/session ID
   * @returns {SessionType} returns.type - Session type
   * @returns {string} [returns.projectId] - Project ID
   * @returns {string[]} [returns.permissions] - User permissions
   * @returns {number} [returns.iat] - Issued at timestamp
   * @returns {number} [returns.exp] - Expiration timestamp
   * 
   * @example
   * const payload = authService.verifyJWT('jwt-token');
   * if (payload) {
   *   console.log('User ID:', payload.id);
   * }
   */
  verifyJWT(token: string): {
    id: string;
    type: SessionType;
    projectId?: string;
    permissions?: string[];
    iat?: number;
    exp?: number;
  } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      if (typeof decoded === "object" && decoded !== null) {
        return decoded as {
          id: string;
          type: SessionType;
          projectId?: string;
          permissions?: string[];
          iat?: number;
          exp?: number;
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Hash a password
   * 
   * Hashes a plain text password using bcrypt with salt rounds of 10.
   * 
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   * 
   * @example
   * const hash = await authService.hashPassword('plain-password');
   * // Store hash in database
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify a password against a hash
   * 
   * Compares a plain text password with a bcrypt hash.
   * 
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password to compare against
   * @returns {Promise<boolean>} True if password matches hash
   * 
   * @example
   * const isValid = await authService.verifyPassword('password', storedHash);
   * if (isValid) {
   *   // Password is correct
   * }
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate API key
   * 
   * Generates a cryptographically secure random API key (64 hex characters).
   * 
   * @returns {string} Generated API key
   * 
   * @example
   * const apiKey = authService.generateApiKey();
   * // Store apiKey in database
   */
  generateApiKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Clean up expired sessions
   * 
   * Removes all expired sessions from the database.
   * 
   * @returns {Promise<number>} Number of sessions cleaned up
   * 
   * @example
   * const count = await authService.cleanupSessions();
   * console.log(`Cleaned up ${count} expired sessions`);
   */
  async cleanupSessions(): Promise<number> {
    return this.db.cleanupExpiredSessions();
  }

  /**
   * Log authentication action
   * 
   * Creates a changelog entry for an authentication-related action.
   * 
   * @param {"login" | "logout" | "session_created" | "password_change" | "api_key_regenerated"} action - Action type
   * @param {string} userId - User ID
   * @param {string} [projectId] - Project ID (if applicable)
   * @param {string} [sessionId] - Session ID (if applicable)
   * @returns {Promise<void>}
   * 
   * @example
   * await authService.logAuthAction('login', 'user-id', undefined, 'session-id');
   */
  async logAuthAction(
    action:
      | "login"
      | "logout"
      | "session_created"
      | "password_change"
      | "api_key_regenerated",
    userId: string,
    projectId?: string,
    sessionId?: string
  ) {
    await this.db.createChangelogEntry({
      project_id: projectId,
      entity_type: "auth",
      entity_id: userId,
      action: "created",
      changes: { action },
      performed_by: userId,
      session_id: sessionId,
      user_id: userId,
      resource_type: "auth",
      resource_id: userId,
    });
  }
}
