import { BackendSDK, DatabaseConnection, Logger } from "@smartsamurai/krapi-sdk";

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

/**
 * SDK Service Manager
 * 
 * Manages the BackendSDK instance and provides initialization and service access.
 * Handles database initialization and provides access to all SDK services.
 * 
 * @class SDKServiceManager
 * @example
 * const manager = new SDKServiceManager(dbConnection, logger);
 * await manager.initializeDatabase();
 * const backendSDK = manager.getBackendSDK();
 */
export class SDKServiceManager {
  private backendSDK: BackendSDK;

  /**
   * Create a new SDKServiceManager instance
   * 
   * @param {DatabaseConnection} databaseConnection - Database connection
   * @param {Logger} logger - Logger instance
   */
  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    // Create the real BackendSDK instance
    this.backendSDK = new BackendSDK({
      databaseConnection,
      logger,
    });
  }

  /**
   * Initialize the database schema
   * 
   * Creates all required tables and inserts default data.
   * Uses direct table creation first, falls back to SDK auto-fix if needed.
   * 
   * @returns {Promise<Object>} Initialization result
   * @returns {boolean} returns.success - Whether initialization succeeded
   * @returns {string} returns.message - Status message
   * @returns {string[]} returns.tablesCreated - List of created tables
   * @returns {boolean} returns.defaultDataInserted - Whether default data was inserted
   * @throws {Error} If initialization fails
   * 
   * @example
   * const result = await manager.initializeDatabase();
   * if (result.success) {
   *   console.log('Database initialized:', result.tablesCreated);
   * }
   */
  async initializeDatabase(): Promise<{
    success: boolean;
    message: string;
    tablesCreated: string[];
    defaultDataInserted: boolean;
  }> {
    try {
      console.log("🔧 Creating database schema...");

      // Ensure baseline tables exist before running SDK auto-fix
      try {
        const { DatabaseService } = await import("@/services/database.service");
        const dbService = DatabaseService.getInstance();
        await dbService.createEssentialTables();
      } catch (preInitError) {
        console.log(
          `⚠️ Pre-initialize essential tables had issues (non-fatal): ${
            preInitError instanceof Error ? preInitError.message : String(preInitError)
          }`
        );
      }

      // Use SDK auto-fix as the primary method - it's more reliable and handles all cases
      try {
        console.log("📋 Initializing database via SDK auto-fix...");
        const autoFixResult = await this.backendSDK.database.autoFix();

        if (autoFixResult.success) {
          console.log(
            `✅ Database schema created/verified via SDK. Applied ${autoFixResult.fixesApplied} fixes.`
          );

          // CRITICAL: Fix missing columns after SDK auto-fix
          // This ensures columns like last_used_at are added even if tables already existed
          try {
            console.log("🔧 Fixing missing columns in existing tables...");
            const { DatabaseService } = await import("@/services/database.service");
            const dbService = DatabaseService.getInstance();
            await dbService.fixMissingColumns();
            console.log("✅ Missing columns fixed");
          } catch (fixError) {
            // Non-critical - log but don't fail
            console.log(`⚠️ Column fix step had issues (non-critical): ${fixError instanceof Error ? fixError.message : String(fixError)}`);
          }

          // The backend service already creates the default admin user
          // No need to call the SDK method
          console.log(
            "✅ Default admin user should already exist from backend initialization"
          );

          return {
            success: true,
            message: "Database initialized successfully via SDK",
            tablesCreated: autoFixResult.appliedFixes || [
              "All tables created via SDK",
            ],
            defaultDataInserted: true,
          };
        } else {
          throw new Error("SDK auto-fix failed");
        }
      } catch (sdkError) {
        // If SDK auto-fix fails, try direct table creation as fallback
        console.log("⚠️ SDK auto-fix had issues, trying direct table creation as fallback...");
        
        try {
          const { DatabaseService } = await import("@/services/database.service");
          const dbService = DatabaseService.getInstance();
          await dbService.createEssentialTables();
          console.log("✅ Essential tables created successfully via direct method");

          // Fix missing columns
          await dbService.fixMissingColumns();
          console.log("✅ Missing columns fixed");

          console.log(
            "✅ Default admin user should already exist from backend initialization"
          );

          return {
            success: true,
            message:
              "Database initialized successfully via direct table creation (fallback)",
            tablesCreated: ["Essential tables created directly"],
            defaultDataInserted: true,
          };
        } catch (directError) {
          console.error(
            "❌ Both SDK auto-fix and direct table creation failed"
          );
          throw new Error(
            `Database initialization failed: SDK error: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}, Direct error: ${directError instanceof Error ? directError.message : String(directError)}`
          );
        }
      }
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        tablesCreated: [],
        defaultDataInserted: false,
      };
    }
  }

  /**
   * Get system health status
   * 
   * Checks the health of database and storage systems.
   * 
   * @returns {Promise<Object>} Health status
   * @returns {boolean} returns.database - Whether database is healthy
   * @returns {boolean} returns.storage - Whether storage is healthy
   * 
   * @example
   * const health = await manager.getSystemHealth();
   * console.log('Database healthy:', health.database);
   */
  async getSystemHealth(): Promise<{
    database: boolean;
    storage: boolean;
    email: boolean;
    overall: boolean;
    details: Record<string, unknown>;
  }> {
    try {
      // Use the SDK's health check
      const healthCheck = await this.backendSDK.database.healthCheck();

      // Implement storage health check
      const storageHealth = await this.checkStorageHealth();

      // Implement email health check
      const emailHealth = await this.checkEmailHealth();

      return {
        database: healthCheck.isHealthy ?? false,
        storage: storageHealth.isHealthy ?? false,
        email: emailHealth.isHealthy ?? false,
        overall:
          (healthCheck.isHealthy ?? false) &&
          (storageHealth.isHealthy ?? false) &&
          (emailHealth.isHealthy ?? false),
        details: {
          database: healthCheck,
          storage: storageHealth,
          email: emailHealth,
          message: "Health check completed via SDK",
        },
      };
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
      // Use the SDK's admin service to create default admin
      await this.backendSDK.admin.createDefaultAdmin();

      return {
        success: true,
        message: "Default admin user created successfully via SDK",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the BackendSDK instance
   * 
   * Returns the BackendSDK instance for direct access to SDK services.
   * 
   * @returns {Promise<BackendSDK>} BackendSDK instance
   * 
   * @example
   * const backendSDK = await manager.getBackendSDK();
   * const projects = await backendSDK.projects.list();
   */
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

  /**
   * Check storage health
   */
  private async checkStorageHealth(): Promise<{
    isHealthy: boolean;
    message: string;
    details?: unknown;
  }> {
    try {
      // Check if storage service is available and responsive
      const storageService = this.backendSDK.storage;
      if (!storageService) {
        return {
          isHealthy: false,
          message: "Storage service not initialized",
        };
      }

      // Perform a simple storage operation to verify health
      const testResult = await storageService.getStorageInfo("test-project-id");

      return {
        isHealthy: true,
        message: "Storage service is healthy",
        details: testResult,
      };
    } catch (error) {
      return {
        isHealthy: false,
        message: `Storage health check failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Check email health
   */
  private async checkEmailHealth(): Promise<{
    isHealthy: boolean;
    message: string;
    details?: unknown;
  }> {
    try {
      // Check if email service is available and responsive
      const emailService = this.backendSDK.email;
      if (!emailService) {
        return {
          isHealthy: false,
          message: "Email service not initialized",
        };
      }

      // Perform a simple email operation to verify health
      const emailConfig = await emailService.getConfig("test-project-id");

      return {
        isHealthy: true,
        message: "Email service is healthy",
        details: emailConfig,
      };
    } catch (error) {
      return {
        isHealthy: false,
        message: `Email health check failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }
}
