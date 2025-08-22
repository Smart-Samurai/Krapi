import { AdminService } from "@krapi/sdk";

// Use the actual SDK types
type AdminUser = Parameters<AdminService["createUser"]>[0] & {
  id: string;
  created_at: string;
  updated_at: string;
};

export class SDKAdminService {
  constructor(private adminService: AdminService) {}

  async createAdminUser(
    adminData: Omit<AdminUser, "id" | "created_at" | "updated_at">
  ): Promise<AdminUser> {
    return await this.adminService.createUser(adminData);
  }

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

  async updateAdminUser(
    userId: string,
    updates: Partial<AdminUser>
  ): Promise<AdminUser | null> {
    return await this.adminService.updateUser(userId, updates);
  }

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
