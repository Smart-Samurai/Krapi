import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";

/**
 * Database Seed Service
 * 
 * Handles seeding default data into the database.
 * Creates default admin user and master API key.
 */
export class DatabaseSeedService {
  constructor(private dbManager: MultiDatabaseManager) {}

  /**
   * Seed default data (admin user, API keys, etc.)
   */
  async seedDefaultData(): Promise<void> {
    try {
      // Check if master admin exists (in main DB)
      const result = await this.dbManager.queryMain(
        "SELECT id FROM admin_users WHERE username = $1",
        ["admin"]
      );

      let adminId: string | undefined;
      let masterApiKey: string | undefined;
      let insertSucceeded = false;

      if (result.rows.length === 0) {
        // Create default master admin with API key
        // Handle race condition: user might be created by ensureDefaultAdmin() concurrently
        try {
          const hashedPassword = await this.hashPassword("admin123");
          masterApiKey = `mak_${uuidv4().replace(/-/g, "")}`;

          adminId = uuidv4();
          await this.dbManager.queryMain(
            `INSERT INTO admin_users (id, username, email, password_hash, role, access_level, api_key) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              adminId,
              "admin",
              "admin@krapi.com",
              hashedPassword,
              "master_admin",
              "full",
              masterApiKey,
            ]
          );
          insertSucceeded = true;
        } catch (insertError: unknown) {
          // Handle race condition: if user was created by another process, fetch existing user
          const error = insertError as { code?: string };
          if (error.code === "SQLITE_CONSTRAINT_UNIQUE" || error.code === "23505") {
            // User already exists (created by ensureDefaultAdmin or another process)
            // Fetch the existing user and continue with update logic
            const existingResult = await this.dbManager.queryMain(
              "SELECT id, api_key FROM admin_users WHERE username = $1",
              ["admin"]
            );
            if (existingResult.rows.length > 0) {
              adminId = existingResult.rows[0]?.id as string;
              masterApiKey = (existingResult.rows[0]?.api_key as string) || undefined;
              // Will fall through to else branch logic to ensure password and API key are set
            } else {
              // Unexpected: error said unique constraint but user doesn't exist
              throw insertError;
            }
          } else {
            throw insertError;
          }
        }
      }
      
      // If admin exists and INSERT didn't succeed, ensure password and API key are correct
      if ((result.rows.length > 0 || adminId) && !insertSucceeded) {
        if (!adminId) {
          if (result.rows.length > 0) {
            adminId = result.rows[0]?.id as string;
          } else {
            // Should not happen, but TypeScript needs this
            throw new Error("Admin ID not found after race condition handling");
          }
        }

        // Ensure default admin has correct password and generate API key if missing
        const defaultPassword =
          process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
        const hashedPassword = await this.hashPassword(defaultPassword);

        // Check if admin has API key
        const adminResult = await this.dbManager.queryMain(
          "SELECT api_key FROM admin_users WHERE username = $1",
          ["admin"]
        );

        if (!(adminResult.rows[0]?.api_key as string)) {
          masterApiKey = `mak_${uuidv4().replace(/-/g, "")}`;
          await this.dbManager.queryMain(
            `UPDATE admin_users 
             SET password_hash = $1, is_active = 1, api_key = $2 
             WHERE username = $3`,
            [hashedPassword, masterApiKey, "admin"]
          );
          console.log(
            "Default master admin password reset and API key generated"
          );
        } else {
          masterApiKey = adminResult.rows[0]?.api_key as string;
          await this.dbManager.queryMain(
            `UPDATE admin_users 
             SET password_hash = $1, is_active = 1 
             WHERE username = $2`,
            [hashedPassword, "admin"]
          );
        }
      }

      // Create or update master API key in api_keys table (main DB)
      if (masterApiKey && adminId) {
        // Check if key already exists
        const existingKey = await this.dbManager.queryMain(
          "SELECT id FROM api_keys WHERE key = $1",
          [masterApiKey]
        );

        if (existingKey.rows.length === 0) {
          await this.dbManager.queryMain(
            `INSERT INTO api_keys (id, key, name, type, owner_id, scopes, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              uuidv4(),
              masterApiKey,
              "Master API Key",
              "admin",
              adminId,
              JSON.stringify(["master"]), // Master scope gives full access - store as JSON
              1,
            ]
          );
        } else {
          await this.dbManager.queryMain(
            `UPDATE api_keys 
             SET is_active = 1, scopes = $1 
             WHERE key = $2`,
            [JSON.stringify(["master"]), masterApiKey]
          );
        }
      }

      // Record successful initialization (system_checks table already created above - main DB)
      const checkId = uuidv4();
      const existingCheck = await this.dbManager.queryMain(
        "SELECT id FROM system_checks WHERE check_type = $1",
        ["database_initialization"]
      );

      if (existingCheck.rows.length === 0) {
        await this.dbManager.queryMain(
          `INSERT INTO system_checks (id, check_type, status, details)
           VALUES ($1, 'database_initialization', 'success', $2)`,
          [
            checkId,
            JSON.stringify({
              version: "1.0.0",
              initialized_at: new Date().toISOString(),
              default_admin_created: result.rows.length === 0,
            }),
          ]
        );
      } else {
        await this.dbManager.queryMain(
          `UPDATE system_checks 
           SET status = 'success', details = $1, last_checked = CURRENT_TIMESTAMP
           WHERE check_type = 'database_initialization'`,
          [
            JSON.stringify({
              version: "1.0.0",
              initialized_at: new Date().toISOString(),
              default_admin_created: result.rows.length === 0,
            }),
          ]
        );
      }
    } catch (error) {
      console.error("Error seeding default data:", error);
      throw error; // Re-throw to ensure proper error handling
    }
  }

  /**
   * Hash password for admin user
   */
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
}








