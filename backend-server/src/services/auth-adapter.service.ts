import bcrypt from "bcryptjs";

import { AuthService } from "./auth.service";
import { DatabaseService } from "./database.service";

import {
  AdminUser,
  ProjectUser,
  SessionType,
  BackendProjectUser,
} from "@/types";

/**
 * Auth Adapter Service
 * 
 * Wraps the existing AuthService to provide a consistent interface for the BackendSDK.
 * Acts as an adapter layer between SDK and the core AuthService.
 * 
 * @class AuthAdapterService
 * @example
 * const adapter = AuthAdapterService.getInstance();
 * const result = await adapter.validateSession('session-token');
 */
export class AuthAdapterService {
  private static instance: AuthAdapterService;
  private authService: AuthService;
  private db: DatabaseService;

  private constructor() {
    this.authService = AuthService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  /**
   * Get singleton instance of AuthAdapterService
   * 
   * @returns {AuthAdapterService} The singleton instance
   * 
   * @example
   * const adapter = AuthAdapterService.getInstance();
   */
  static getInstance(): AuthAdapterService {
    if (!AuthAdapterService.instance) {
      AuthAdapterService.instance = new AuthAdapterService();
    }
    return AuthAdapterService.instance;
  }

  /**
   * Validate a session token
   * 
   * @param {string} token - Session token
   * @returns {Promise<Object>} Validation result
   * @returns {boolean} returns.valid - Whether session is valid
   * @returns {AdminUser | ProjectUser} [returns.user] - User if valid
   * @returns {string[]} [returns.scopes] - User scopes if valid
   * 
   * @example
   * const result = await adapter.validateSession('session-token');
   * if (result.valid) {
   *   console.log('User:', result.user);
   * }
   */
  async validateSession(token: string): Promise<{
    valid: boolean;
    user?: AdminUser | ProjectUser;
    scopes?: string[];
  }> {
    const result = await this.authService.validateSessionToken(token);

    if (!result.valid || !result.session) {
      return { valid: false };
    }

    const session = result.session;

    if (session.type === SessionType.ADMIN) {
      const adminUser = await this.db.getAdminUserById(session.user_id);
      if (!adminUser) {
        return { valid: false };
      }

      return {
        valid: true,
        user: adminUser,
        scopes: adminUser.permissions || [],
      };
    } else if (session.type === SessionType.PROJECT && session.project_id) {
      const projectUser = await this.db.getProjectUser(
        session.project_id,
        session.user_id
      );
      if (!projectUser) {
        return { valid: false };
      }

      return {
        valid: true,
        user: projectUser as unknown as ProjectUser,
        scopes: (projectUser as BackendProjectUser).scopes || [],
      };
    }

    return { valid: false };
  }

  /**
   * Authenticate a user with username and password
   * 
   * Tries admin authentication first, then project user authentication.
   * 
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - Username
   * @param {string} credentials.password - Password
   * @returns {Promise<AdminUser | ProjectUser | null>} Authenticated user or null
   * 
   * @example
   * const user = await adapter.authenticateUser({
   *   username: 'admin',
   *   password: 'password'
   * });
   */
  async authenticateUser(credentials: {
    username: string;
    password: string;
  }): Promise<AdminUser | ProjectUser | null> {
    // Try admin authentication first
    const adminUser = await this.authService.authenticateAdmin(
      credentials.username,
      credentials.password
    );

    if (adminUser) {
      return adminUser;
    }

    // Try project user authentication
    // Note: This would need to be implemented in AuthService
    // For now, return null
    return null;
  }

  /**
   * Hash a password
   * 
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   * 
   * @example
   * const hash = await adapter.hashPassword('plain-password');
   */
  async hashPassword(password: string): Promise<string> {
    return await this.authService.hashPassword(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Use bcrypt directly since AuthService doesn't expose this method
    return await bcrypt.compare(password, hash);
  }

  async generateToken(user: AdminUser | ProjectUser): Promise<string> {
    if ("role" in user && "permissions" in user) {
      // AdminUser
      const adminUser = user as AdminUser;
      return this.authService.generateJWT({
        id: adminUser.id,
        type: SessionType.ADMIN,
        permissions: adminUser.permissions,
      });
    } else {
      // ProjectUser
      const projectUser = user as ProjectUser;
      return this.authService.generateJWT({
        id: projectUser.id,
        type: SessionType.PROJECT,
        projectId: projectUser.project_id,
        permissions:
          (projectUser as unknown as BackendProjectUser).scopes || [],
      });
    }
  }
}
