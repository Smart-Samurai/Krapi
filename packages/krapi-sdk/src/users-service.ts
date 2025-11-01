/**
 * Users Service for BackendSDK
 *
 * Provides comprehensive user management functionality including:
 * - Project-specific user management
 * - User authentication and authorization
 * - User profile management
 * - User roles and permissions within projects
 * - User activity tracking
 */

import bcrypt from "bcryptjs";

import { DatabaseConnection, Logger } from "./core";
import { CountRow } from "./database-types";

export interface ProjectUser {
  id: string;
  project_id: string;
  username?: string;
  email?: string;
  external_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  permissions: string[];
  metadata: Record<string, unknown>;
  is_active: boolean;
  last_login?: string;
  login_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  password_hash?: string;
}

export interface UserRole {
  id: string;
  project_id: string;
  name: string;
  display_name: string;
  description?: string;
  permissions: string[];
  is_default: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  project_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  last_active: string;
  expires_at: string;
  is_active: boolean;
}

export interface UserActivity {
  id: string;
  user_id: string;
  project_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CreateUserRequest {
  username?: string;
  email?: string;
  external_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  role?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
  password?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  external_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  role?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

export interface UserFilter {
  role?: string;
  is_active?: boolean;
  search?: string;
  created_after?: string;
  created_before?: string;
  last_login_after?: string;
  last_login_before?: string;
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  users_by_role: Record<string, number>;
  recent_logins: number;
  new_users_this_month: number;
  most_active_users: Array<{
    user_id: string;
    username: string;
    activity_count: number;
  }>;
}

export class UsersService {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  // User CRUD Operations
  async getAllUsers(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: UserFilter;
    }
  ): Promise<ProjectUser[]> {
    try {
      let query = "SELECT * FROM project_users WHERE project_id = $1";
      const params: unknown[] = [projectId];
      let paramCount = 1;

      if (options?.filter) {
        const { filter } = options;

        if (filter.role) {
          paramCount++;
          query += ` AND role = $${paramCount}`;
          params.push(filter.role);
        }

        if (filter.is_active !== undefined) {
          paramCount++;
          query += ` AND is_active = $${paramCount}`;
          params.push(filter.is_active);
        }

        if (filter.search) {
          paramCount++;
          query += ` AND (username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR display_name ILIKE $${paramCount})`;
          params.push(`%${filter.search}%`);
        }

        if (filter.created_after) {
          paramCount++;
          query += ` AND created_at >= $${paramCount}`;
          params.push(filter.created_after);
        }

        if (filter.created_before) {
          paramCount++;
          query += ` AND created_at <= $${paramCount}`;
          params.push(filter.created_before);
        }

        if (filter.last_login_after) {
          paramCount++;
          query += ` AND last_login >= $${paramCount}`;
          params.push(filter.last_login_after);
        }

        if (filter.last_login_before) {
          paramCount++;
          query += ` AND last_login <= $${paramCount}`;
          params.push(filter.last_login_before);
        }
      }

      query += " ORDER BY created_at DESC";

      if (options?.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(options.limit);
      }

      if (options?.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows as ProjectUser[];
    } catch (error) {
      this.logger.error("Failed to get users:", error);
      throw new Error("Failed to get users");
    }
  }

  async getUserById(
    projectId: string,
    userId: string
  ): Promise<ProjectUser | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM project_users WHERE project_id = $1 AND id = $2",
        [projectId, userId]
      );
      return result.rows.length > 0 ? (result.rows[0] as ProjectUser) : null;
    } catch (error) {
      this.logger.error("Failed to get user by ID:", error);
      throw new Error("Failed to get user by ID");
    }
  }

  async getUserByEmail(
    projectId: string,
    email: string
  ): Promise<ProjectUser | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM project_users WHERE project_id = $1 AND email = $2",
        [projectId, email]
      );
      return result.rows.length > 0 ? (result.rows[0] as ProjectUser) : null;
    } catch (error) {
      this.logger.error("Failed to get user by email:", error);
      throw new Error("Failed to get user by email");
    }
  }

  async getUserByUsername(
    projectId: string,
    username: string
  ): Promise<ProjectUser | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM project_users WHERE project_id = $1 AND username = $2",
        [projectId, username]
      );
      return result.rows.length > 0 ? (result.rows[0] as ProjectUser) : null;
    } catch (error) {
      this.logger.error("Failed to get user by username:", error);
      throw new Error("Failed to get user by username");
    }
  }

  async createUser(
    projectId: string,
    userData: CreateUserRequest,
    createdBy?: string
  ): Promise<ProjectUser> {
    try {
      // Hash password if provided
      let passwordHash: string | undefined;
      if (userData.password) {
        passwordHash = await this.hashPassword(userData.password);
      }

      // Get default role if not specified
      const role = userData.role || "member";

      // Get default permissions for role
      const permissions =
        userData.permissions ||
        (await this.getDefaultPermissionsForRole(projectId, role));

      const result = await this.db.query(
        `INSERT INTO project_users (
          project_id, username, email, external_id, first_name, last_name, 
          display_name, avatar_url, role, permissions, metadata, password_hash, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
        RETURNING *`,
        [
          projectId,
          userData.username,
          userData.email,
          userData.external_id,
          userData.first_name,
          userData.last_name,
          userData.display_name,
          userData.avatar_url,
          role,
          permissions,
          userData.metadata || {},
          passwordHash,
          createdBy,
        ]
      );

      // Log user creation activity
      await this.logUserActivity({
        user_id: createdBy || "system",
        project_id: projectId,
        action: "user_created",
        entity_type: "user",
        entity_id: (result.rows[0] as { id: string }).id,
        details: { username: userData.username, email: userData.email, role },
      });

      return result.rows[0] as ProjectUser;
    } catch (error) {
      this.logger.error("Failed to create user:", error);
      throw new Error("Failed to create user");
    }
  }

  async updateUser(
    projectId: string,
    userId: string,
    updates: UpdateUserRequest,
    updatedBy?: string
  ): Promise<ProjectUser | null> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (updates.username !== undefined) {
        fields.push(`username = $${paramCount++}`);
        values.push(updates.username);
      }
      if (updates.email !== undefined) {
        fields.push(`email = $${paramCount++}`);
        values.push(updates.email);
      }
      if (updates.external_id !== undefined) {
        fields.push(`external_id = $${paramCount++}`);
        values.push(updates.external_id);
      }
      if (updates.first_name !== undefined) {
        fields.push(`first_name = $${paramCount++}`);
        values.push(updates.first_name);
      }
      if (updates.last_name !== undefined) {
        fields.push(`last_name = $${paramCount++}`);
        values.push(updates.last_name);
      }
      if (updates.display_name !== undefined) {
        fields.push(`display_name = $${paramCount++}`);
        values.push(updates.display_name);
      }
      if (updates.avatar_url !== undefined) {
        fields.push(`avatar_url = $${paramCount++}`);
        values.push(updates.avatar_url);
      }
      if (updates.role !== undefined) {
        fields.push(`role = $${paramCount++}`);
        values.push(updates.role);
      }
      if (updates.permissions !== undefined) {
        fields.push(`permissions = $${paramCount++}`);
        values.push(updates.permissions);
      }
      if (updates.metadata !== undefined) {
        // Merge with existing metadata
        const currentUser = await this.getUserById(projectId, userId);
        if (currentUser) {
          const mergedMetadata = {
            ...currentUser.metadata,
            ...updates.metadata,
          };
          fields.push(`metadata = $${paramCount++}`);
          values.push(mergedMetadata);
        }
      }
      if (updates.is_active !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(updates.is_active);
      }

      if (fields.length === 0) {
        return this.getUserById(projectId, userId);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(projectId, userId);

      const result = await this.db.query(
        `UPDATE project_users SET ${fields.join(", ")} 
         WHERE project_id = $${paramCount++} AND id = $${paramCount} 
         RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        // Log user update activity
        await this.logUserActivity({
          user_id: updatedBy || "system",
          project_id: projectId,
          action: "user_updated",
          entity_type: "user",
          entity_id: userId,
          details: updates as Record<string, unknown>,
        });
      }

      return result.rows.length > 0 ? (result.rows[0] as ProjectUser) : null;
    } catch (error) {
      this.logger.error("Failed to update user:", error);
      throw new Error("Failed to update user");
    }
  }

  async deleteUser(
    projectId: string,
    userId: string,
    deletedBy?: string
  ): Promise<boolean> {
    try {
      // Soft delete by setting is_active to false
      const result = await this.db.query(
        `UPDATE project_users SET is_active = false, updated_at = CURRENT_TIMESTAMP 
         WHERE project_id = $1 AND id = $2`,
        [projectId, userId]
      );

      if (result.rowCount > 0) {
        // Log user deletion activity
        await this.logUserActivity({
          user_id: deletedBy || "system",
          project_id: projectId,
          action: "user_deleted",
          entity_type: "user",
          entity_id: userId,
          details: { soft_delete: true },
        });
      }

      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to delete user:", error);
      throw new Error("Failed to delete user");
    }
  }

  async hardDeleteUser(
    projectId: string,
    userId: string,
    deletedBy?: string
  ): Promise<boolean> {
    try {
      // Log before deletion
      await this.logUserActivity({
        user_id: deletedBy || "system",
        project_id: projectId,
        action: "user_hard_deleted",
        entity_type: "user",
        entity_id: userId,
        details: { hard_delete: true },
      });

      // Delete user sessions
      await this.db.query(
        "DELETE FROM user_sessions WHERE user_id = $1 AND project_id = $2",
        [userId, projectId]
      );

      // Delete user activities (optional - you might want to keep them for audit)
      // await this.db.query(
      //   "DELETE FROM user_activities WHERE user_id = $1 AND project_id = $2",
      //   [userId, projectId]
      // );

      // Delete the user
      const result = await this.db.query(
        "DELETE FROM project_users WHERE project_id = $1 AND id = $2",
        [projectId, userId]
      );

      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to hard delete user:", error);
      throw new Error("Failed to hard delete user");
    }
  }

  // Role Management
  async getAllRoles(projectId: string): Promise<UserRole[]> {
    try {
      const result = await this.db.query(
        "SELECT * FROM user_roles WHERE project_id = $1 ORDER BY name",
        [projectId]
      );
      return result.rows as UserRole[];
    } catch (error) {
      this.logger.error("Failed to get roles:", error);
      throw new Error("Failed to get roles");
    }
  }

  async createRole(
    projectId: string,
    roleData: {
      name: string;
      display_name: string;
      description?: string;
      permissions: string[];
      is_default?: boolean;
    }
  ): Promise<UserRole> {
    try {
      const result = await this.db.query(
        `INSERT INTO user_roles (project_id, name, display_name, description, permissions, is_default)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          projectId,
          roleData.name,
          roleData.display_name,
          roleData.description,
          roleData.permissions,
          roleData.is_default || false,
        ]
      );
      return result.rows[0] as UserRole;
    } catch (error) {
      this.logger.error("Failed to create role:", error);
      throw new Error("Failed to create role");
    }
  }

  async updateRole(
    projectId: string,
    roleId: string,
    updates: {
      display_name?: string;
      description?: string;
      permissions?: string[];
      is_default?: boolean;
    }
  ): Promise<UserRole | null> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (updates.display_name !== undefined) {
        fields.push(`display_name = $${paramCount++}`);
        values.push(updates.display_name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.permissions !== undefined) {
        fields.push(`permissions = $${paramCount++}`);
        values.push(updates.permissions);
      }
      if (updates.is_default !== undefined) {
        fields.push(`is_default = $${paramCount++}`);
        values.push(updates.is_default);
      }

      if (fields.length === 0) {
        const result = await this.db.query(
          "SELECT * FROM user_roles WHERE project_id = $1 AND id = $2",
          [projectId, roleId]
        );
        return result.rows.length > 0 ? (result.rows[0] as UserRole) : null;
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(projectId, roleId);

      const result = await this.db.query(
        `UPDATE user_roles SET ${fields.join(", ")} 
         WHERE project_id = $${paramCount++} AND id = $${paramCount} 
         RETURNING *`,
        values
      );

      return result.rows.length > 0 ? (result.rows[0] as UserRole) : null;
    } catch (error) {
      this.logger.error("Failed to update role:", error);
      throw new Error("Failed to update role");
    }
  }

  // User Activity Tracking
  async logUserActivity(activityData: {
    user_id: string;
    project_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO user_activities (
          user_id, project_id, action, entity_type, entity_id, details, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          activityData.user_id,
          activityData.project_id,
          activityData.action,
          activityData.entity_type,
          activityData.entity_id,
          JSON.stringify(activityData.details),
          activityData.ip_address,
          activityData.user_agent,
        ]
      );
    } catch (error) {
      this.logger.error("Failed to log user activity:", error);
      // Don't throw here as this shouldn't break the main operation
    }
  }

  async getUserActivity(
    projectId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action_filter?: string;
      entity_type_filter?: string;
    }
  ): Promise<UserActivity[]> {
    try {
      let query =
        "SELECT * FROM user_activities WHERE project_id = $1 AND user_id = $2";
      const params: unknown[] = [projectId, userId];
      let paramCount = 2;

      if (options?.action_filter) {
        paramCount++;
        query += ` AND action = $${paramCount}`;
        params.push(options.action_filter);
      }

      if (options?.entity_type_filter) {
        paramCount++;
        query += ` AND entity_type = $${paramCount}`;
        params.push(options.entity_type_filter);
      }

      query += " ORDER BY created_at DESC";

      if (options?.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(options.limit);
      }

      if (options?.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows as UserActivity[];
    } catch (error) {
      this.logger.error("Failed to get user activity:", error);
      throw new Error("Failed to get user activity");
    }
  }

  // User Statistics
  async getUserStatistics(projectId: string): Promise<UserStatistics> {
    try {
      const [
        totalUsersResult,
        activeUsersResult,
        usersByRoleResult,
        recentLoginsResult,
        newUsersResult,
        mostActiveUsersResult,
      ] = await Promise.all([
        this.db.query(
          "SELECT COUNT(*) FROM project_users WHERE project_id = $1",
          [projectId]
        ),
        this.db.query(
          "SELECT COUNT(*) FROM project_users WHERE project_id = $1 AND is_active = true",
          [projectId]
        ),
        this.db.query(
          "SELECT role, COUNT(*) as count FROM project_users WHERE project_id = $1 GROUP BY role",
          [projectId]
        ),
        this.db.query(
          "SELECT COUNT(*) FROM project_users WHERE project_id = $1 AND last_login >= CURRENT_DATE - INTERVAL '7 days'",
          [projectId]
        ),
        this.db.query(
          "SELECT COUNT(*) FROM project_users WHERE project_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)",
          [projectId]
        ),
        this.db.query(
          `
          SELECT u.id as user_id, u.username, COUNT(a.id) as activity_count
          FROM project_users u
          LEFT JOIN user_activities a ON u.id = a.user_id
          WHERE u.project_id = $1 AND a.created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY u.id, u.username
          ORDER BY activity_count DESC
          LIMIT 10
        `,
          [projectId]
        ),
      ]);

      const usersByRole: Record<string, number> = {};
      for (const row of usersByRoleResult.rows) {
        const typedRow = row as { role: string; count: string };
        usersByRole[typedRow.role] = parseInt(typedRow.count);
      }

      return {
        total_users: parseInt((totalUsersResult.rows[0] as CountRow).count),
        active_users: parseInt((activeUsersResult.rows[0] as CountRow).count),
        users_by_role: usersByRole,
        recent_logins: parseInt((recentLoginsResult.rows[0] as CountRow).count),
        new_users_this_month: parseInt(
          (newUsersResult.rows[0] as CountRow).count
        ),
        most_active_users: mostActiveUsersResult.rows.map((row) => {
          const typedRow = row as {
            user_id: string;
            username: string;
            activity_count: string;
          };
          return {
            user_id: typedRow.user_id,
            username: typedRow.username,
            activity_count: parseInt(typedRow.activity_count),
          };
        }),
      };
    } catch (error) {
      this.logger.error("Failed to get user statistics:", error);
      throw new Error("Failed to get user statistics");
    }
  }

  // Utility Methods
  private async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      this.logger.error("Failed to hash password:", error);
      // Fallback for development
      return `hashed_${password}`;
    }
  }

  private async getDefaultPermissionsForRole(
    projectId: string,
    roleName: string
  ): Promise<string[]> {
    try {
      const result = await this.db.query(
        "SELECT permissions FROM user_roles WHERE project_id = $1 AND name = $2",
        [projectId, roleName]
      );

      if (result.rows.length > 0) {
        return (result.rows[0] as { permissions: string[] }).permissions;
      }

      // Default permissions based on common roles
      const defaultPermissions: Record<string, string[]> = {
        admin: ["*"], // All permissions
        member: [
          "projects:read",
          "collections:read",
          "collections:write",
          "documents:read",
          "documents:write",
          "files:read",
          "files:write",
        ],
        viewer: [
          "projects:read",
          "collections:read",
          "documents:read",
          "files:read",
        ],
        guest: ["projects:read", "collections:read", "documents:read"],
      };

      return defaultPermissions[roleName] || defaultPermissions.member || [];
    } catch (error) {
      this.logger.error("Failed to get default permissions for role:", error);
      return ["projects:read", "collections:read", "documents:read"];
    }
  }

  // Password management
  async changeUserPassword(
    projectId: string,
    userId: string,
    newPassword: string,
    changedBy?: string
  ): Promise<boolean> {
    try {
      const passwordHash = await this.hashPassword(newPassword);

      const result = await this.db.query(
        `UPDATE project_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE project_id = $2 AND id = $3`,
        [passwordHash, projectId, userId]
      );

      if (result.rowCount > 0) {
        await this.logUserActivity({
          user_id: changedBy || userId,
          project_id: projectId,
          action: "password_changed",
          entity_type: "user",
          entity_id: userId,
          details: { changed_by: changedBy || "self" },
        });
      }

      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to change user password:", error);
      throw new Error("Failed to change user password");
    }
  }
}
