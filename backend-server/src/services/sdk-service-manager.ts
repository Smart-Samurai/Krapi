import { BackendSDK, DatabaseConnection, Logger } from "@krapi/sdk";

// Use the actual SDK types - AdminService.createUser expects AdminUser$1
interface AdminUser$1 {
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

export class SDKServiceManager {
  private backendSDK: BackendSDK;

  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.backendSDK = new BackendSDK({
      databaseConnection,
      logger,
      enableAutoFix: true,
      enableHealthChecks: true,
    });
  }

  async initializeDatabase(): Promise<{
    success: boolean;
    message: string;
    tablesCreated: string[];
    defaultDataInserted: boolean;
  }> {
    try {
      // SDK doesn't have initializeDatabase, this would need to be implemented
      throw new Error("initializeDatabase not implemented in SDK");
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        tablesCreated: [],
        defaultDataInserted: false,
      };
    }
  }

  async getSystemHealth(): Promise<{
    database: boolean;
    storage: boolean;
    email: boolean;
    overall: boolean;
    details: Record<string, unknown>;
  }> {
    try {
      // SDK doesn't have getSystemHealth, this would need to be implemented
      throw new Error("getSystemHealth not implemented in SDK");
    } catch (error) {
      return {
        database: false,
        storage: false,
        email: false,
        overall: false,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  async createDefaultAdmin(): Promise<{
    success: boolean;
    message: string;
    adminUser?: unknown;
  }> {
    try {
      // SDK doesn't have createDefaultAdmin, this would need to be implemented
      throw new Error("createDefaultAdmin not implemented in SDK");
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getBackendSDK(): Promise<BackendSDK> {
    return this.backendSDK;
  }

  async createDefaultAdminUser(): Promise<unknown> {
    try {
      // Create default admin user using SDK
      const adminUser = await this.backendSDK.admin.createUser({
        username: "admin",
        email: "admin@krapi.local",
        password_hash: "dummy_hash", // This will be hashed by the SDK
        role: "admin",
        access_level: "full",
        permissions: ["admin:read", "admin:write"],
        active: true,
      });

      return {
        success: true,
        message: "Default admin user created successfully",
        adminUser,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create default admin user",
      };
    }
  }

  async getAdminUserById(userId: string): Promise<AdminUser$1 | null> {
    try {
      return await this.backendSDK.admin.getUserById(userId);
    } catch {
      return null;
    }
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser$1 | null> {
    try {
      // SDK doesn't have getAdminUserByUsername, we need to get all users and filter
      const users = await this.backendSDK.admin.getUsers({
        limit: 1000,
        offset: 0,
      });
      return (
        users.find((user: AdminUser$1) => user.username === username) || null
      );
    } catch {
      return null;
    }
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser$1 | null> {
    try {
      // SDK doesn't have getAdminUserByEmail, we need to get all users and filter
      const users = await this.backendSDK.admin.getUsers({
        limit: 1000,
        offset: 0,
      });
      return users.find((user: AdminUser$1) => user.email === email) || null;
    } catch {
      return null;
    }
  }

  async getAllAdminUsers(
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      role?: string;
      active?: boolean;
    } = {}
  ): Promise<AdminUser$1[]> {
    try {
      const { limit = 100, offset = 0, search, role, active } = options;

      // SDK only supports basic pagination, we'll implement filtering in memory for now
      let users = await this.backendSDK.admin.getUsers({
        limit: 1000,
        offset: 0,
      });

      if (search) {
        users = users.filter(
          (user: AdminUser$1) =>
            user.username.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (role) {
        users = users.filter((user: AdminUser$1) => user.role === role);
      }

      if (active !== undefined) {
        users = users.filter((user: AdminUser$1) => user.active === active);
      }

      return users.slice(offset, offset + limit);
    } catch {
      return [];
    }
  }

  async updateAdminUser(
    userId: string,
    updates: Partial<AdminUser$1>
  ): Promise<AdminUser$1 | null> {
    try {
      return await this.backendSDK.admin.updateUser(userId, updates);
    } catch {
      return null;
    }
  }

  async deleteAdminUser(userId: string): Promise<boolean> {
    try {
      return await this.backendSDK.admin.deleteUser(userId);
    } catch {
      return false;
    }
  }

  async toggleAdminUserStatus(userId: string): Promise<AdminUser$1 | null> {
    try {
      const user = await this.backendSDK.admin.getUserById(userId);
      if (!user) return null;

      return await this.backendSDK.admin.updateUser(userId, {
        active: !user.active,
      });
    } catch {
      return null;
    }
  }

  async createAdminApiKey(
    userId: string,
    apiKeyData: {
      name: string;
      permissions: string[];
      expires_at?: string;
    }
  ): Promise<{
    key: string;
    data: unknown;
  }> {
    try {
      return await this.backendSDK.admin.createApiKey(userId, apiKeyData);
    } catch {
      throw new Error("Failed to create admin API key");
    }
  }

  async getAdminApiKeys(userId: string): Promise<unknown[]> {
    try {
      return await this.backendSDK.admin.getUserApiKeys(userId);
    } catch {
      return [];
    }
  }

  async revokeAdminApiKey(apiKeyId: string): Promise<boolean> {
    try {
      return await this.backendSDK.admin.deleteApiKey(apiKeyId);
    } catch {
      return false;
    }
  }

  async getActivityLogs(
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      userId?: string;
      action?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<unknown[]> {
    try {
      const { limit = 100, offset = 0, userId, action } = options;

      // SDK requires limit and offset, and has different filter structure
      const filters: Record<string, string> = {};
      if (userId) filters.performed_by = userId;
      if (action) filters.action = action;

      return await this.backendSDK.admin.getActivityLogs({
        limit: limit || 100,
        offset: offset || 0,
        filters,
      });
    } catch {
      return [];
    }
  }

  async getSystemDiagnostics(): Promise<unknown> {
    try {
      // SDK doesn't have getSystemDiagnostics, use runDiagnostics instead
      return await this.backendSDK.admin.runDiagnostics();
    } catch {
      return {
        success: false,
        message: "Failed to run diagnostics",
      };
    }
  }

  async updateSystemSettings(_settings: unknown): Promise<unknown> {
    // SDK doesn't have updateSystemSettings, this would need to be implemented
    throw new Error("updateSystemSettings not implemented in SDK");
  }

  async getSystemSettings(): Promise<unknown> {
    try {
      // SDK doesn't have getSystemSettings, use getSystemStats instead
      return await this.backendSDK.admin.getSystemStats();
    } catch {
      return {
        success: false,
        message: "Failed to get system stats",
      };
    }
  }

  async backupSystem(): Promise<unknown> {
    // SDK doesn't have backupSystem, this would need to be implemented
    throw new Error("backupSystem not implemented in SDK");
  }

  async restoreSystem(_backupId: string): Promise<unknown> {
    // SDK doesn't have restoreSystem, this would need to be implemented
    throw new Error("restoreSystem not implemented in SDK");
  }

  async getBackupList(): Promise<unknown[]> {
    // SDK doesn't have getBackupList, this would need to be implemented
    throw new Error("getBackupList not implemented in SDK");
  }
}
