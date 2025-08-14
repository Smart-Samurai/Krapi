import bcrypt from "bcryptjs";

import { AuthService } from "./auth.service";
import { DatabaseService } from "./database.service";

import { AdminUser, ProjectUser, SessionType } from "@/types";

/**
 * Auth Adapter Service
 *
 * This service wraps the existing AuthService to provide
 * a consistent interface for the BackendSDK.
 */
export class AuthAdapterService {
  private static instance: AuthAdapterService;
  private authService: AuthService;
  private db: DatabaseService;

  private constructor() {
    this.authService = AuthService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): AuthAdapterService {
    if (!AuthAdapterService.instance) {
      AuthAdapterService.instance = new AuthAdapterService();
    }
    return AuthAdapterService.instance;
  }

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
        user: projectUser,
        scopes: projectUser.scopes || [],
      };
    }

    return { valid: false };
  }

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

  async hashPassword(password: string): Promise<string> {
    return await this.authService.hashPassword(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Use bcrypt directly since AuthService doesn't expose this method
    return await bcrypt.compare(password, hash);
  }

  async generateToken(user: AdminUser | ProjectUser): Promise<string> {
    if ("role" in user) {
      // AdminUser
      return this.authService.generateJWT({
        id: user.id,
        type: SessionType.ADMIN,
        permissions: user.permissions,
      });
    } else {
      // ProjectUser
      return this.authService.generateJWT({
        id: user.id,
        type: SessionType.PROJECT,
        projectId: user.project_id,
        permissions: user.scopes,
      });
    }
  }
}
