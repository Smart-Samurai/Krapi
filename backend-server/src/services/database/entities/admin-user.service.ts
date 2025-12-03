import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";
import { DatabaseMappersService } from "../database-mappers.service";

import { AdminUser } from "@/types";

/**
 * Admin User Service
 *
 * Handles all admin user CRUD operations.
 * Admin users are stored in the main database.
 */
export class AdminUserService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService,
    private mappers: DatabaseMappersService
  ) {}

  /**
   * Create a new admin user
   */
  async createAdminUser(
    data: Omit<
      AdminUser,
      "id" | "createdAt" | "updatedAt" | "lastLogin" | "loginCount"
    > & { password?: string }
  ): Promise<AdminUser> {
    await this.core.ensureReady();
    const hashedPassword =
      data.password_hash ||
      (data.password ? await bcrypt.hash(data.password, 10) : "");

    const adminId = uuidv4();

    // Insert into main DB
    await this.dbManager.queryMain(
      `INSERT INTO admin_users (id, username, email, password_hash, role, access_level, permissions, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        adminId,
        data.username,
        data.email,
        hashedPassword,
        data.role,
        data.access_level,
        JSON.stringify(data.permissions || []),
        data.active ?? true ? 1 : 0,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users WHERE id = $1",
      [adminId]
    );

    if (!result.rows[0]) {
      throw new Error("Failed to retrieve created admin user");
    }

    return this.mappers.mapAdminUser(result.rows[0]);
  }

  /**
   * Get admin user by username
   */
  async getAdminUserByUsername(username: string): Promise<AdminUser | null> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users WHERE username = $1",
      [username]
    );

    const row = result.rows[0];
    return row
      ? this.mappers.mapAdminUser(row as Record<string, unknown>)
      : null;
  }

  /**
   * Get admin user by email
   */
  async getAdminUserByEmail(email: string): Promise<AdminUser | null> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users WHERE email = $1",
      [email]
    );

    const row = result.rows[0];
    return row
      ? this.mappers.mapAdminUser(row as Record<string, unknown>)
      : null;
  }

  /**
   * Get admin user by ID
   */
  async getAdminUserById(id: string): Promise<AdminUser | null> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users WHERE id = $1",
      [id]
    );

    const row = result.rows[0];
    return row
      ? this.mappers.mapAdminUser(row as Record<string, unknown>)
      : null;
  }

  /**
   * Get admin user by API key
   */
  async getAdminUserByApiKey(apiKey: string): Promise<AdminUser | null> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users WHERE api_key = $1 AND is_active = 1",
      [apiKey]
    );

    const row = result.rows[0];
    return row
      ? this.mappers.mapAdminUser(row as Record<string, unknown>)
      : null;
  }

  /**
   * Get all admin users
   */
  async getAllAdminUsers(): Promise<AdminUser[]> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users ORDER BY created_at DESC"
    );

    return result.rows.map((row) => this.mappers.mapAdminUser(row));
  }

  /**
   * Update admin user password
   */
  async updateAdminUserPassword(
    id: string,
    passwordHash: string
  ): Promise<AdminUser | null> {
    await this.core.ensureReady();
    // SQLite doesn't support RETURNING *, so update and query back separately
    await this.dbManager.queryMain(
      "UPDATE admin_users SET password_hash = $1 WHERE id = $2",
      [passwordHash, id]
    );

    // Query back the updated row
    return this.getAdminUserById(id);
  }

  /**
   * Update admin user API key
   */
  async updateAdminUserApiKey(
    id: string,
    apiKey: string
  ): Promise<AdminUser | null> {
    await this.core.ensureReady();
    // SQLite doesn't support RETURNING *, so update and query back separately
    await this.dbManager.queryMain(
      "UPDATE admin_users SET api_key = $1 WHERE id = $2",
      [apiKey, id]
    );

    // Query back the updated row
    return this.getAdminUserById(id);
  }

  /**
   * Update admin user
   */
  async updateAdminUser(
    id: string,
    data: Partial<AdminUser>
  ): Promise<AdminUser | null> {
    await this.core.ensureReady();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(data.role);
    }
    if (data.access_level !== undefined) {
      fields.push(`access_level = $${paramCount++}`);
      values.push(data.access_level);
    }
    // Handle 'active' field (AdminUser type uses 'active', database uses 'is_active')
    if (data.active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.active ? 1 : 0); // SQLite uses INTEGER 1/0 for booleans
    }
    if (data.api_key !== undefined) {
      fields.push(`api_key = $${paramCount++}`);
      values.push(data.api_key);
    }
    if (data.last_login !== undefined) {
      fields.push(`last_login = $${paramCount++}`);
      values.push(data.last_login);
    }
    if ("password" in data && typeof data.password === "string") {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      fields.push(`password_hash = $${paramCount++}`);
      values.push(hashedPassword);
    }
    if (data.password_hash !== undefined) {
      fields.push(`password_hash = $${paramCount++}`);
      values.push(data.password_hash);
    }

    if (fields.length === 0) return this.getAdminUserById(id);

    values.push(id);
    // SQLite doesn't support RETURNING *, so update and query back separately
    await this.dbManager.queryMain(
      `UPDATE admin_users SET ${fields.join(", ")} WHERE id = $${paramCount}`,
      values
    );

    // Query back the updated row
    return this.getAdminUserById(id);
  }

  /**
   * Update login info
   */
  async updateLoginInfo(id: string): Promise<void> {
    await this.core.ensureReady();
    await this.dbManager.queryMain(
      `UPDATE admin_users 
       SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 
       WHERE id = $1`,
      [id]
    );
  }

  /**
   * Enable admin account
   */
  async enableAdminAccount(adminUserId: string): Promise<boolean> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "UPDATE admin_users SET is_active = 1 WHERE id = $1",
      [adminUserId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Disable admin account
   */
  async disableAdminAccount(adminUserId: string): Promise<boolean> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "UPDATE admin_users SET is_active = 0 WHERE id = $1",
      [adminUserId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get admin account status
   */
  async getAdminAccountStatus(
    adminUserId: string
  ): Promise<{ is_active: boolean } | null> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT is_active FROM admin_users WHERE id = $1",
      [adminUserId]
    );
    return result.rows.length > 0
      ? (result.rows[0] as { is_active: boolean })
      : null;
  }

  /**
   * Delete admin user
   */
  async deleteAdminUser(id: string): Promise<boolean> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "DELETE FROM admin_users WHERE id = $1",
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Verify admin password
   */
  async verifyAdminPassword(
    username: string,
    password: string
  ): Promise<AdminUser | null> {
    await this.core.ensureReady();
    const user = await this.getAdminUserByUsername(username);
    if (!user || !user.active) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    await this.updateLoginInfo(user.id);
    return user;
  }
}
