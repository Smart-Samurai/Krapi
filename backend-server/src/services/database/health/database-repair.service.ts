import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseSchemaService } from "../schema/database-schema.service";
import { DatabaseSeedService } from "../schema/database-seed.service";

import { DatabaseHealthService } from "./database-health.service";

/**
 * Database Repair Service
 *
 * Handles database auto-repair, schema fixes, and missing column fixes.
 */
export class DatabaseRepairService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private healthService: DatabaseHealthService,
    private schemaService: DatabaseSchemaService,
    private seedService: DatabaseSeedService
  ) {}

  /**
   * Auto-repair database issues
   */
  async autoRepair(): Promise<{
    success: boolean;
    repairs: string[];
    health: {
      status: string;
      checks: Record<
        string,
        { status: boolean; message: string; missing?: string[] }
      >;
    };
  }> {
    const repairs: string[] = [];

    try {
      const health = await this.healthService.performHealthCheck();

      if (health.status === "healthy") {
        return { success: true, repairs: [], health };
      }

      // Fix missing tables
      if (!health.checks.tables.status && health.checks.tables.missing) {
        if (!this.schemaService.isInitializingTables) {
          if (process.env.NODE_ENV === "development") {
            await this.schemaService.createEssentialTables();
            repairs.push("Re-initialized missing tables");
          } else {
            await this.schemaService.initializeTables();
            repairs.push("Re-initialized missing tables");
          }
        } else {
          repairs.push("Skipped migrations (fresh database)");
        }
      } else {
        repairs.push("Initialized tables directly");
      }

      // Fix missing columns
      await this.fixMissingColumns();
      repairs.push("Fixed missing columns");

      // Fix default admin
      if (!health.checks.defaultAdmin.status) {
        await this.seedService.seedDefaultData();
        repairs.push("Created default admin user");
      }

      return { success: true, repairs, health };
    } catch (error) {
      console.error("Auto-repair failed:", error);
      return {
        success: false,
        repairs: [],
        health: await this.healthService.performHealthCheck(),
      };
    }
  }

  /**
   * Repair database issues found during health check
   */
  async repairDatabase(): Promise<{ success: boolean; actions: string[] }> {
    const actions: string[] = [];

    try {
      // Run health check first
      const health = await this.healthService.performHealthCheck();

      // Fix missing tables (only if not already initializing)
      if (
        !health.checks.tables.status &&
        health.checks.tables.missing &&
        !this.schemaService.isInitializingTables
      ) {
        console.log("Repairing: Creating missing tables...");
        await this.schemaService.initializeTables();
        actions.push("Created missing tables");
      } else if (this.schemaService.isInitializingTables) {
        console.log("⚠️  Skipping table creation - already initializing");
      }

      // Fix missing columns in existing tables
      await this.fixMissingColumns();
      actions.push("Fixed missing columns");

      // Fix default admin
      if (!health.checks.defaultAdmin.status) {
        await this.seedService.seedDefaultData();
        actions.push("Fixed default admin user");
      }

      // Record repair action (main DB)
      const checkId = uuidv4();
      const existingCheck = await this.dbManager.queryMain(
        "SELECT id FROM system_checks WHERE check_type = 'database_repair'",
        []
      );

      if (existingCheck.rows.length === 0) {
        await this.dbManager.queryMain(
          `INSERT INTO system_checks (id, check_type, status, details)
           VALUES ($1, 'database_repair', 'success', $2)`,
          [
            checkId,
            JSON.stringify({
              actions,
              repaired_at: new Date().toISOString(),
            }),
          ]
        );
      } else {
        await this.dbManager.queryMain(
          `UPDATE system_checks 
           SET status = 'success', details = $1, last_checked = CURRENT_TIMESTAMP
           WHERE check_type = 'database_repair'`,
          [
            JSON.stringify({
              actions,
              repaired_at: new Date().toISOString(),
            }),
          ]
        );
      }

      return { success: true, actions };
    } catch (error) {
      console.error("Database repair failed:", error);
      return { success: false, actions };
    }
  }

  /**
   * Fix missing columns in existing tables
   */
  async fixMissingColumns(): Promise<void> {
    try {
      // Check and add missing columns to sessions table (SQLite uses PRAGMA table_info) - main DB
      const sessionColumns = await this.dbManager.queryMain(
        `PRAGMA table_info(sessions)`
      );
      const existingSessionColumns = (
        sessionColumns.rows as Array<{ name: string }>
      ).map((row) => row.name);

      // Add consumed column if missing
      if (!existingSessionColumns.includes("consumed")) {
        await this.dbManager.queryMain(`
          ALTER TABLE sessions ADD COLUMN consumed INTEGER DEFAULT 0
        `);
        console.log("Added missing 'consumed' column to sessions table");
      }

      // Add consumed_at column if missing
      if (!existingSessionColumns.includes("consumed_at")) {
        await this.dbManager.queryMain(`
          ALTER TABLE sessions ADD COLUMN consumed_at TEXT
        `);
        console.log("Added missing 'consumed_at' column to sessions table");
      }

      // Add user_type column if missing
      if (!existingSessionColumns.includes("user_type")) {
        await this.dbManager.queryMain(`
          ALTER TABLE sessions ADD COLUMN user_type TEXT CHECK (user_type IN ('admin', 'project'))
        `);
        await this.dbManager.queryMain(`
          UPDATE sessions SET user_type = type WHERE user_type IS NULL
        `);
        console.log("Added missing 'user_type' column to sessions table");
      }

      // Add ip_address column if missing
      if (!existingSessionColumns.includes("ip_address")) {
        await this.dbManager.queryMain(`
          ALTER TABLE sessions ADD COLUMN ip_address TEXT
        `);
        console.log("Added missing 'ip_address' column to sessions table");
      }

      // Add user_agent column if missing
      if (!existingSessionColumns.includes("user_agent")) {
        await this.dbManager.queryMain(`
          ALTER TABLE sessions ADD COLUMN user_agent TEXT
        `);
        console.log("Added missing 'user_agent' column to sessions table");
      }

      // Add last_used_at column if missing (SDK requires this)
      if (!existingSessionColumns.includes("last_used_at")) {
        await this.dbManager.queryMain(`
          ALTER TABLE sessions ADD COLUMN last_used_at TEXT DEFAULT CURRENT_TIMESTAMP
        `);
        // Migrate existing data: copy last_activity to last_used_at if available
        await this.dbManager.queryMain(`
          UPDATE sessions SET last_used_at = last_activity WHERE last_used_at IS NULL AND last_activity IS NOT NULL
        `);
        // Set default for any remaining null values
        await this.dbManager.queryMain(`
          UPDATE sessions SET last_used_at = created_at WHERE last_used_at IS NULL
        `);
        console.log("Added missing 'last_used_at' column to sessions table");
      }

      // Check and add missing columns to projects table - main DB
      const projectColumns = await this.dbManager.queryMain(
        `PRAGMA table_info(projects)`
      );
      const existingProjectColumns = (
        projectColumns.rows as Array<{ name: string }>
      ).map((row) => row.name);

      // Add is_active column if missing
      if (!existingProjectColumns.includes("is_active")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects ADD COLUMN is_active INTEGER DEFAULT 1
        `);
        console.log("Added missing 'is_active' column to projects table");
      }

      // Add created_by column if missing
      if (!existingProjectColumns.includes("created_by")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects ADD COLUMN created_by TEXT NOT NULL REFERENCES admin_users(id) DEFAULT ''
        `);
        console.log("Added missing 'created_by' column to projects table");
      }

      // Add settings column if missing
      if (!existingProjectColumns.includes("settings")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects ADD COLUMN settings TEXT DEFAULT '{}'
        `);
        console.log("Added missing 'settings' column to projects table");
      }

      // Add storage_used column if missing
      if (!existingProjectColumns.includes("storage_used")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects ADD COLUMN storage_used INTEGER DEFAULT 0
        `);
        console.log("Added missing 'storage_used' column to projects table");
      }

      // Add api_calls_count column if missing
      if (!existingProjectColumns.includes("api_calls_count")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects ADD COLUMN api_calls_count INTEGER DEFAULT 0
        `);
        console.log("Added missing 'api_calls_count' column to projects table");
      }

      // Add last_api_call column if missing
      if (!existingProjectColumns.includes("last_api_call")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects ADD COLUMN last_api_call TEXT
        `);
        console.log("Added missing 'last_api_call' column to projects table");
      }

      // Add project_url column if missing
      if (!existingProjectColumns.includes("project_url")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects ADD COLUMN project_url TEXT
        `);
        console.log("Added missing 'project_url' column to projects table");
      }

      // Check and add missing columns to admin_users table - main DB
      const adminUserColumns = await this.dbManager.queryMain(
        `PRAGMA table_info(admin_users)`
      );
      const existingAdminUserColumns = (
        adminUserColumns.rows as Array<{ name: string }>
      ).map((row) => row.name);

      // Add password_hash column if it doesn't exist (rename from password if needed)
      if (!existingAdminUserColumns.includes("password_hash")) {
        if (existingAdminUserColumns.includes("password")) {
          // Rename password column to password_hash
          await this.dbManager.queryMain(`
            ALTER TABLE admin_users 
            RENAME COLUMN password TO password_hash
          `);
          console.log(
            "Renamed 'password' column to 'password_hash' in admin_users table"
          );
        } else {
          // Add password_hash column
          await this.dbManager.queryMain(`
            ALTER TABLE admin_users 
            ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''
          `);
          console.log(
            "Added missing 'password_hash' column to admin_users table"
          );
        }
      }

      // Add api_key column if it doesn't exist
      if (!existingAdminUserColumns.includes("api_key")) {
        await this.dbManager.queryMain(`
          ALTER TABLE admin_users 
          ADD COLUMN api_key VARCHAR(255) UNIQUE
        `);
        console.log("Added missing 'api_key' column to admin_users table");
      }
    } catch (error) {
      console.error("Error fixing missing columns:", error);
    }
  }
}
