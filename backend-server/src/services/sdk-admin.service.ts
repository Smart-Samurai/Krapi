import { AdminService } from "@krapi/sdk";

/**
 * Admin user type
 * 
 * @typedef {Object} AdminUser
 * @property {string} id - User ID
 * @property {string} username - Username
 * @property {string} email - Email address
 * @property {string} password_hash - Hashed password
 * @property {string} role - User role
 * @property {string} access_level - Access level
 * @property {string[]} permissions - User permissions
 * @property {boolean} active - Whether user is active
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 * @property {string} [last_login] - Last login timestamp
 * @property {string} [api_key] - API key
 * @property {number} [login_count] - Login count
 */
// Use the actual SDK types
type AdminUser = Parameters<AdminService["createUser"]>[0] & {
  id: string;
  created_at: string;
  updated_at: string;
};

/**
 * SDK Admin Service Wrapper
 * 
 * Wrapper service that delegates to the SDK AdminService.
 * Provides a consistent interface for backend services to access admin user operations.
 * 
 * @class SDKAdminService
 * @example
 * const adminService = new AdminService(dbConnection);
 * const sdkAdminService = new SDKAdminService(adminService);
 * const user = await sdkAdminService.createAdminUser(adminData);
 */
export class SDKAdminService {
  /**
   * Create a new SDKAdminService instance
   * 
   * @param {AdminService} adminService - SDK AdminService instance
   */
  constructor(private adminService: AdminService) {}

  /**
   * Create a new admin user
   * 
   * @param {Object} adminData - Admin user data (without id, created_at, updated_at)
   * @returns {Promise<AdminUser>} Created admin user
   * 
   * @example
   * const admin = await sdkAdminService.createAdminUser({
   *   username: 'newadmin',
   *   email: 'admin@example.com',
   *   password_hash: 'hashed-password',
   *   role: 'admin',
   *   access_level: 'full',
   *   permissions: [],
   *   active: true
   * });
   */
  async createAdminUser(
    adminData: Omit<AdminUser, "id" | "created_at" | "updated_at">
  ): Promise<AdminUser> {
    return await this.adminService.createUser(adminData);
  }

  /**
   * Get admin user by ID
   * 
   * @param {string} userId - User ID
   * @returns {Promise<AdminUser | null>} Admin user or null if not found
   * 
   * @example
   * const user = await sdkAdminService.getAdminUserById('user-id');
   */
  async getAdminUserById(userId: string): Promise<AdminUser | null> {
    return await this.adminService.getUserById(userId);
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | null> {
    // SDK doesn't have getAdminUserByUsername, we need to get all users and filter
    const users = await this.adminService.getUsers({ limit: 1000, offset: 0 });
    return users.find((user) => user.username === username) || null;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | null> {
    // SDK doesn't have getAdminUserByEmail, we need to get all users and filter
    const users = await this.adminService.getUsers({ limit: 1000, offset: 0 });
    return users.find((user) => user.email === email) || null;
  }

  /**
   * Get all admin users with filtering
   * 
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of users
   * @param {number} [options.offset] - Number of users to skip
   * @param {string} [options.search] - Search term for username/email
   * @param {string} [options.role] - Filter by role
   * @param {boolean} [options.active] - Filter by active status
   * @returns {Promise<AdminUser[]>} Array of admin users
   * 
   * @example
   * const users = await sdkAdminService.getAllAdminUsers({
   *   limit: 10,
   *   search: 'admin',
   *   active: true
   * });
   */
  async getAllAdminUsers(
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      role?: string;
      active?: boolean;
    } = {}
  ): Promise<AdminUser[]> {
    const { limit = 100, offset = 0, search, role, active } = options;

    // SDK only supports basic pagination, we'll implement filtering in memory for now
    let users = await this.adminService.getUsers({ limit: 1000, offset: 0 });

    if (search) {
      users = users.filter(
        (user) =>
          user.username.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (role) {
      users = users.filter((user) => user.role === role);
    }

    if (active !== undefined) {
      users = users.filter((user) => user.active === active);
    }

    return users.slice(offset, offset + limit);
  }

  /**
   * Update an admin user
   * 
   * @param {string} userId - User ID
   * @param {Partial<AdminUser>} updates - User updates
   * @returns {Promise<AdminUser | null>} Updated user or null if not found
   * 
   * @example
   * const updated = await sdkAdminService.updateAdminUser('user-id', {
   *   email: 'newemail@example.com'
   * });
   */
  async updateAdminUser(
    userId: string,
    updates: Partial<AdminUser>
  ): Promise<AdminUser | null> {
    return await this.adminService.updateUser(userId, updates);
  }

  /**
   * Delete an admin user
   * 
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if deleted successfully
   * 
   * @example
   * await sdkAdminService.deleteAdminUser('user-id');
   */
  async deleteAdminUser(userId: string): Promise<boolean> {
    return await this.adminService.deleteUser(userId);
  }

  async toggleAdminUserStatus(userId: string): Promise<AdminUser | null> {
    const user = await this.adminService.getUserById(userId);
    if (!user) return null;

    return await this.adminService.updateUser(userId, { active: !user.active });
  }

  async createAdminApiKey(
    userId: string,
    apiKeyData: {
      name: string;
      permissions: string[];
      expires_at?: string;
    }
  ): Promise<{ key: string; data: unknown }> {
    return await this.adminService.createApiKey(userId, apiKeyData);
  }

  async getAdminApiKeys(userId: string): Promise<unknown[]> {
    return await this.adminService.getUserApiKeys(userId);
  }

  async revokeAdminApiKey(apiKeyId: string): Promise<boolean> {
    return await this.adminService.deleteApiKey(apiKeyId);
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
    const { limit = 100, offset = 0, userId, action } = options;

    // SDK requires limit and offset, and has different filter structure
    const filters: Record<string, string> = {};
    if (userId) filters.performed_by = userId;
    if (action) filters.action = action;

    return await this.adminService.getActivityLogs({
      limit: limit || 100,
      offset: offset || 0,
      filters,
    });
  }

  async getSystemDiagnostics(): Promise<unknown> {
    // SDK doesn't have getSystemDiagnostics, use runDiagnostics instead
    return await this.adminService.runDiagnostics();
  }

  async updateSystemSettings(_settings: unknown): Promise<unknown> {
    // SDK doesn't have updateSystemSettings, this would need to be implemented
    throw new Error("updateSystemSettings not implemented in SDK");
  }

  async getSystemSettings(): Promise<unknown> {
    // SDK doesn't have getSystemSettings, use getSystemStats instead
    return await this.adminService.getSystemStats();
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
