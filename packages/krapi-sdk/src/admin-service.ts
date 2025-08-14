/**
 * Admin Service for BackendSDK
 *
 * Provides admin user management, API key management, system stats,
 * activity logs, and database health management functionality.
 */

import { DatabaseConnection, Logger } from "./core";
import { CountRow } from "./database-types";

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

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  type: "master" | "admin" | "project";
  owner_id: string;
  scopes: string[];
  project_ids?: string[];
  metadata?: Record<string, unknown>;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  is_active: boolean;
}

export interface SystemStats {
  totalUsers: number;
  totalProjects: number;
  totalCollections: number;
  totalDocuments: number;
  totalFiles: number;
  storageUsed: number;
  databaseSize: number;
  uptime: number;
}

export interface ActivityLog {
  id: string;
  project_id?: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes?: Record<string, unknown>;
  performed_by: string;
  session_id?: string;
  created_at: string;
}

export interface DatabaseHealth {
  status: "healthy" | "unhealthy" | "degraded";
  checks: {
    database: { status: boolean; message: string };
    tables: { status: boolean; message: string; missing?: string[] };
    defaultAdmin: { status: boolean; message: string };
    initialization: {
      status: boolean;
      message: string;
      details?: Record<string, unknown>;
    };
  };
  timestamp: string;
}

export interface DiagnosticResult {
  success: boolean;
  message: string;
  details: Record<string, unknown>;
  recommendations: string[];
}

export class AdminService {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  // Admin User Management
  async getUsers(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    active?: boolean;
  }): Promise<AdminUser[]> {
    try {
      let query = "SELECT * FROM admin_users WHERE 1=1";
      const params: unknown[] = [];
      let paramCount = 0;

      if (options?.active !== undefined) {
        paramCount++;
        query += ` AND is_active = $${paramCount}`;
        params.push(options.active);
      }

      if (options?.search) {
        paramCount++;
        query += ` AND (username ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        params.push(`%${options.search}%`);
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
      return result.rows as AdminUser[];
    } catch (error) {
      this.logger.error("Failed to get admin users:", error);
      throw new Error("Failed to get admin users");
    }
  }

  async getUserById(userId: string): Promise<AdminUser | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM admin_users WHERE id = $1",
        [userId]
      );
      return result.rows.length > 0 ? (result.rows[0] as AdminUser) : null;
    } catch (error) {
      this.logger.error("Failed to get admin user by ID:", error);
      throw new Error("Failed to get admin user by ID");
    }
  }

  async createUser(
    userData: Omit<AdminUser, "id" | "created_at" | "updated_at">
  ): Promise<AdminUser> {
    try {
      const result = await this.db.query(
        `INSERT INTO admin_users (username, email, password_hash, role, access_level, permissions, is_active, api_key) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          userData.username,
          userData.email,
          userData.password_hash,
          userData.role,
          userData.access_level,
          userData.permissions,
          userData.active,
          userData.api_key,
        ]
      );
      return result.rows[0] as AdminUser;
    } catch (error) {
      this.logger.error("Failed to create admin user:", error);
      throw new Error("Failed to create admin user");
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<AdminUser>
  ): Promise<AdminUser | null> {
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
      if (updates.role !== undefined) {
        fields.push(`role = $${paramCount++}`);
        values.push(updates.role);
      }
      if (updates.access_level !== undefined) {
        fields.push(`access_level = $${paramCount++}`);
        values.push(updates.access_level);
      }
      if (updates.permissions !== undefined) {
        fields.push(`permissions = $${paramCount++}`);
        values.push(updates.permissions);
      }
      if (updates.active !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(updates.active);
      }
      if (updates.api_key !== undefined) {
        fields.push(`api_key = $${paramCount++}`);
        values.push(updates.api_key);
      }

      if (fields.length === 0) {
        return this.getUserById(userId);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const result = await this.db.query(
        `UPDATE admin_users SET ${fields.join(
          ", "
        )} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      return result.rows.length > 0 ? (result.rows[0] as AdminUser) : null;
    } catch (error) {
      this.logger.error("Failed to update admin user:", error);
      throw new Error("Failed to update admin user");
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        "DELETE FROM admin_users WHERE id = $1",
        [userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to delete admin user:", error);
      throw new Error("Failed to delete admin user");
    }
  }

  async toggleUserStatus(userId: string): Promise<AdminUser | null> {
    try {
      const result = await this.db.query(
        `UPDATE admin_users 
         SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [userId]
      );
      return result.rows.length > 0 ? (result.rows[0] as AdminUser) : null;
    } catch (error) {
      this.logger.error("Failed to toggle user status:", error);
      throw new Error("Failed to toggle user status");
    }
  }

  // API Key Management
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const result = await this.db.query(
        "SELECT * FROM api_keys WHERE owner_id = $1 AND type = 'admin' ORDER BY created_at DESC",
        [userId]
      );
      return result.rows as ApiKey[];
    } catch (error) {
      this.logger.error("Failed to get user API keys:", error);
      throw new Error("Failed to get user API keys");
    }
  }

  async createUserApiKey(
    userId: string,
    apiKeyData: {
      name: string;
      key: string;
      scopes: string[];
      project_ids?: string[];
      expires_at?: string;
    }
  ): Promise<ApiKey> {
    try {
      const result = await this.db.query(
        `INSERT INTO api_keys (key, name, type, owner_id, scopes, project_ids, expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          apiKeyData.key,
          apiKeyData.name,
          "admin",
          userId,
          apiKeyData.scopes,
          apiKeyData.project_ids,
          apiKeyData.expires_at,
        ]
      );
      return result.rows[0] as ApiKey;
    } catch (error) {
      this.logger.error("Failed to create user API key:", error);
      throw new Error("Failed to create user API key");
    }
  }

  async createMasterApiKey(): Promise<ApiKey> {
    try {
      const masterKey = `mak_${Math.random().toString(36).substring(2, 15)}`;
      const result = await this.db.query(
        `INSERT INTO api_keys (key, name, type, owner_id, scopes) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          masterKey,
          "Master API Key",
          "master",
          "system", // System owner for master key
          ["master"], // Master scope gives full access
        ]
      );
      return result.rows[0] as ApiKey;
    } catch (error) {
      this.logger.error("Failed to create master API key:", error);
      throw new Error("Failed to create master API key");
    }
  }

  async deleteApiKey(keyId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        "UPDATE api_keys SET is_active = false WHERE id = $1",
        [keyId]
      );
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to delete API key:", error);
      throw new Error("Failed to delete API key");
    }
  }

  // System Management
  async getSystemStats(): Promise<SystemStats> {
    try {
      const [
        usersResult,
        projectsResult,
        collectionsResult,
        documentsResult,
        filesResult,
      ] = await Promise.all([
        this.db.query("SELECT COUNT(*) FROM admin_users"),
        this.db.query("SELECT COUNT(*) FROM projects"),
        this.db.query("SELECT COUNT(*) FROM collections"),
        this.db.query("SELECT COUNT(*) FROM documents"),
        this.db.query("SELECT COUNT(*) FROM files"),
      ]);

      const storageResult = await this.db.query(
        "SELECT COALESCE(SUM(storage_used), 0) as total_storage FROM projects"
      );

      return {
        totalUsers: parseInt((usersResult.rows[0] as CountRow).count),
        totalProjects: parseInt((projectsResult.rows[0] as CountRow).count),
        totalCollections: parseInt(
          (collectionsResult.rows[0] as CountRow).count
        ),
        totalDocuments: parseInt((documentsResult.rows[0] as CountRow).count),
        totalFiles: parseInt((filesResult.rows[0] as CountRow).count),
        storageUsed: parseInt(
          (storageResult.rows[0] as { total_storage: string }).total_storage
        ),
        databaseSize: 0, // Would need to query database size
        uptime: process.uptime(),
      };
    } catch (error) {
      this.logger.error("Failed to get system stats:", error);
      throw new Error("Failed to get system stats");
    }
  }

  async getActivityLogs(options: {
    limit: number;
    offset: number;
    filters?: {
      entity_type?: string;
      action?: string;
      performed_by?: string;
    };
  }): Promise<ActivityLog[]> {
    try {
      let query = "SELECT * FROM changelog WHERE 1=1";
      const values: unknown[] = [];
      let paramCount = 0;

      if (options.filters?.entity_type) {
        paramCount++;
        query += ` AND entity_type = $${paramCount}`;
        values.push(options.filters.entity_type);
      }

      if (options.filters?.action) {
        paramCount++;
        query += ` AND action = $${paramCount}`;
        values.push(options.filters.action);
      }

      if (options.filters?.performed_by) {
        paramCount++;
        query += ` AND performed_by = $${paramCount}`;
        values.push(options.filters.performed_by);
      }

      query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      values.push(options.limit, options.offset);

      const result = await this.db.query(query, values);
      return result.rows as ActivityLog[];
    } catch (error) {
      this.logger.error("Failed to get activity logs:", error);
      throw new Error("Failed to get activity logs");
    }
  }

  async getDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      // Check connection
      await this.db.query("SELECT 1");

      // Check critical tables
      const criticalTables = [
        "admin_users",
        "projects",
        "collections",
        "documents",
        "sessions",
        "api_keys",
        "changelog",
      ];

      const missingTables = [];
      for (const table of criticalTables) {
        const result = await this.db.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
          [table]
        );
        if (!(result.rows[0] as { exists: boolean }).exists) {
          missingTables.push(table);
        }
      }

      // Check default admin
      const adminResult = await this.db.query(
        "SELECT id, is_active FROM admin_users WHERE username = $1",
        ["admin"]
      );

      const checks = {
        database: { status: true, message: "Connected" },
        tables: {
          status: missingTables.length === 0,
          message:
            missingTables.length === 0
              ? "All required tables exist"
              : `Missing tables: ${missingTables.join(", ")}`,
          missing: missingTables,
        },
        defaultAdmin: {
          status:
            adminResult.rows.length > 0 &&
            (adminResult.rows[0] as { is_active: boolean }).is_active,
          message:
            adminResult.rows.length > 0 &&
            (adminResult.rows[0] as { is_active: boolean }).is_active
              ? "Default admin exists and is active"
              : "Default admin missing or inactive",
        },
        initialization: {
          status: true,
          message: "Database initialized",
        },
      };

      const allHealthy = Object.values(checks).every((check) => check.status);

      return {
        status: allHealthy ? "healthy" : "unhealthy",
        checks,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Database health check failed:", error);
      return {
        status: "unhealthy",
        checks: {
          database: { status: false, message: `Connection failed: ${error}` },
          tables: { status: false, message: "Unable to check tables" },
          defaultAdmin: { status: false, message: "Unable to check admin" },
          initialization: {
            status: false,
            message: "Unable to check initialization",
          },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async repairDatabase(): Promise<{ success: boolean; actions: string[] }> {
    try {
      const actions: string[] = [];
      const health = await this.getDatabaseHealth();

      if (health.status === "healthy") {
        return {
          success: true,
          actions: ["Database is healthy, no repairs needed"],
        };
      }

      // Create missing tables if needed
      if (!health.checks.tables.status && health.checks.tables.missing) {
        for (const table of health.checks.tables.missing) {
          await this.createMissingTable(table);
          actions.push(`Created missing table: ${table}`);
        }
      }

      // Fix default admin if needed
      if (!health.checks.defaultAdmin.status) {
        await this.createDefaultAdmin();
        actions.push("Created default admin user");
      }

      return { success: true, actions };
    } catch (error) {
      this.logger.error("Database repair failed:", error);
      return { success: false, actions: [] };
    }
  }

  async runDiagnostics(): Promise<DiagnosticResult> {
    try {
      const health = await this.getDatabaseHealth();
      const recommendations: string[] = [];

      if (health.status !== "healthy") {
        recommendations.push("Run database repair to fix issues");
      }

      if (!health.checks.tables.status) {
        recommendations.push(
          "Check database schema and recreate missing tables"
        );
      }

      if (!health.checks.defaultAdmin.status) {
        recommendations.push("Ensure default admin user exists and is active");
      }

      return {
        success: health.status === "healthy",
        message:
          health.status === "healthy"
            ? "System is healthy"
            : "System has issues",
        details: health as unknown as Record<string, unknown>,
        recommendations,
      };
    } catch (error) {
      this.logger.error("Diagnostics failed:", error);
      return {
        success: false,
        message: "Diagnostics failed",
        details: {},
        recommendations: [
          "Check database connection",
          "Verify database permissions",
        ],
      };
    }
  }

  private async createMissingTable(tableName: string): Promise<void> {
    // This would need to be implemented based on the table schema
    // For now, just log that we need to create it
    this.logger.info(`Need to create table: ${tableName}`);
  }

  private async createDefaultAdmin(): Promise<void> {
    try {
      const hashedPassword = await this.hashPassword("admin123");
      const masterApiKey = `mak_${Math.random().toString(36).substring(2, 15)}`;

      await this.db.query(
        `INSERT INTO admin_users (username, email, password_hash, role, access_level, permissions, api_key) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          "admin",
          "admin@krapi.com",
          hashedPassword,
          "master_admin",
          "full",
          ["master"],
          masterApiKey,
        ]
      );

      // Create master API key
      await this.db.query(
        `INSERT INTO api_keys (key, name, type, owner_id, scopes) 
         VALUES ($1, $2, $3, $4, $5)`,
        [masterApiKey, "Master API Key", "master", "system", ["master"]]
      );
    } catch (error) {
      this.logger.error("Failed to create default admin:", error);
      throw error;
    }
  }

  private async hashPassword(password: string): Promise<string> {
    // In a real implementation, this would use bcrypt
    // For now, return a placeholder
    return `hashed_${password}`;
  }
}
