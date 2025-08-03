import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { DatabaseService } from "./database.service";
import {
  AdminUser,
  AdminRole,
  Session,
  SessionType,
  Scope,
  ApiKey,
  ChangeAction,
  Project,
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
   * @returns AuthService instance
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

  // Admin Authentication
  async authenticateAdmin(
    email: string,
    password: string
  ): Promise<AdminUser | null> {
    const user = await this.db.getAdminUserByEmail(email);
    if (!user || !user.active) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    // Update last login
    this.db.updateAdminUser(user.id, { last_login: new Date().toISOString() });

    return user;
  }

  /**
   * Get scopes for a given admin role
   */
  getScopesForRole(role: AdminRole): Scope[] {
    switch (role) {
      case AdminRole.MASTER_ADMIN:
        return [Scope.MASTER]; // Master scope includes everything

      case AdminRole.ADMIN:
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
   */
  async createAdminSessionWithScopes(adminUser: AdminUser): Promise<Session> {
    const scopes = this.getScopesForRole(adminUser.role);

    const session = await this.db.createSession({
      token: this.generateSecureToken(),
      type: SessionType.ADMIN,
      user_id: adminUser.id,
      scopes,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      consumed: false,
    });

    return session;
  }

  /**
   * Create project session with appropriate scopes
   */
  async createProjectSessionWithScopes(
    projectId: string,
    scopes?: Scope[]
  ): Promise<Session> {
    const project = await this.db.getProjectById(projectId);
    if (!project || !project.active) {
      throw new Error("Project not found or inactive");
    }

    const sessionScopes = scopes || this.getDefaultProjectScopes();

    const session = await this.db.createSession({
      token: this.generateSecureToken(),
      type: SessionType.PROJECT,
      project_id: projectId,
      scopes: sessionScopes,
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
    return `tok_${require("crypto").randomBytes(32).toString("hex")}`;
  }

  // Validate Session Token (without consuming)
  async validateSessionToken(
    token: string
  ): Promise<{ valid: boolean; session?: Session }> {
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

  // Generate JWT Token (for after session validation)
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

  // Verify JWT Token
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

  // Hash Password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Get Project Permissions
  private getProjectPermissions(project: Project): string[] {
    const permissions = [
      "database.read",
      "database.write",
      "storage.read",
      "storage.write",
      "users.read",
      "users.write",
    ];

    // Add additional permissions based on project settings
    if (project.settings.email_config) {
      permissions.push("email.send");
    }

    return permissions;
  }

  // Clean up expired sessions
  async cleanupSessions(): Promise<number> {
    return this.db.cleanupExpiredSessions();
  }

  // Log authentication action
  async logAuthAction(
    action: "login" | "logout" | "session_created",
    userId: string,
    projectId?: string,
    sessionId?: string
  ) {
    await this.db.createChangelogEntry({
      project_id: projectId,
      entity_type: "auth",
      entity_id: userId,
      action: ChangeAction.CREATED,
      changes: { action },
      performed_by: userId,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    });
  }
}
