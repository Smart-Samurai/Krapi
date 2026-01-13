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
    try {
      const result = await this.authService.validateSessionToken(token);

      if (!result.valid || !result.session) {
        return { valid: false };
      }

      const session = result.session;

      // WORKAROUND: SDK creates sessions with type: null, so we need to infer type
      // Try to determine session type from user_type field or by looking up the user
      let sessionType = session.type;
      
      // If type is null, try to infer from user_type field
      if (!sessionType && (session as { user_type?: string }).user_type) {
        const userType = (session as { user_type: string }).user_type;
        if (userType === "admin") {
          sessionType = SessionType.ADMIN;
        } else if (userType === "project" || userType === "project_user") {
          sessionType = SessionType.PROJECT;
        }
      }

      // If still null, try to infer by looking up the user
      if (!sessionType) {
        // Try admin user first (most common case)
        const adminUser = await this.db.getAdminUserById(session.user_id);
        if (adminUser) {
          sessionType = SessionType.ADMIN;
        } else if (session.project_id) {
          // If has project_id, likely a project session
          sessionType = SessionType.PROJECT;
        }
      }

      if (sessionType === SessionType.ADMIN) {
        const adminUser = await this.db.getAdminUserById(session.user_id);
        if (!adminUser) {
          return { valid: false };
        }

        // WORKAROUND: If session has empty scopes, derive from user role
        let scopes: string[] = [];
        if (session.scopes && session.scopes.length > 0) {
          scopes = session.scopes.map((s) => s.toString());
        } else {
          // Derive scopes from user role
          const authService = AuthService.getInstance();
          scopes = authService
            .getScopesForRole(adminUser.role)
            .map((scope) => scope.toString());
        }

        return {
          valid: true,
          user: adminUser,
          scopes,
        };
      } else if (sessionType === SessionType.PROJECT && session.project_id) {
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
    } catch (error) {
      // Log error but return invalid session instead of throwing
      console.error("Error validating session:", error);
      return { valid: false };
    }
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
    // Project users are stored in project-specific databases (in project_users table via SDK)
    // We need to search across all projects to find the user
    try {
      // Get all projects
      const projects = await this.db.getAllProjects();
      console.log(`[AUTH DEBUG] Searching for project user ${credentials.username} across ${projects.length} project(s)`);
      
      // Search for user across all projects
      for (const project of projects) {
        try {
          console.log(`[AUTH DEBUG] Checking project ${project.id} for user ${credentials.username}`);
          // Get user from project's project_users table (SDK stores users here)
          const user = await this.db.getProjectUserByUsername(project.id, credentials.username);
          
          if (user) {
            console.log(`[AUTH DEBUG] User ${credentials.username} found in project ${project.id}`);
            // Verify password
            // SDK stores password hash in 'password_hash' field in project_users table
            // Legacy users store it in 'password' field in users collection
            // Prioritize password_hash (SDK standard) over password (legacy)
            const userWithPassword = user as { password?: string; password_hash?: string };
            const passwordHash = userWithPassword.password_hash || userWithPassword.password;
            
            if (!passwordHash) {
              console.log(`[AUTH DEBUG] User ${credentials.username} found in project ${project.id} but no password hash available. User object keys: ${Object.keys(user).join(", ")}`);
              continue; // No password hash, skip this user
            }
            
            console.log(`[AUTH DEBUG] Verifying password for user ${credentials.username} in project ${project.id}, hash length: ${passwordHash.length}`);
            const isValid = await this.verifyPassword(credentials.password, passwordHash);
            
            if (isValid) {
              console.log(`[AUTH DEBUG] Password verified successfully for user ${credentials.username} in project ${project.id}`);
              // Return project user (convert BackendProjectUser to ProjectUser format)
              // Use TypeMapper to ensure correct mapping
              const { TypeMapper } = await import("@/lib/type-mapper");
              const projectUser = TypeMapper.mapProjectUser(user as BackendProjectUser);
              return projectUser;
            } else {
              console.log(`[AUTH DEBUG] Password verification failed for user ${credentials.username} in project ${project.id}`);
            }
          } else {
            console.log(`[AUTH DEBUG] User ${credentials.username} not found in project ${project.id}`);
          }
        } catch (error) {
          // Continue searching in other projects if this one fails
          console.log(`[AUTH DEBUG] Error searching for user ${credentials.username} in project ${project.id}: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
      }
      console.log(`[AUTH DEBUG] User ${credentials.username} not found in any project`);
    } catch (error) {
      // If project user search fails, return null
      console.error(`[AUTH DEBUG] Error searching for project user ${credentials.username}:`, error);
    }
    
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
