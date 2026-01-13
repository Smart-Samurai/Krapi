import { MultiDatabaseManager } from "../../multi-database-manager.service";

import { DatabaseSeedService } from "./database-seed.service";

/**
 * Database Schema Service
 *
 * Handles table creation, schema management, and migrations.
 * Responsible for initializing all database tables.
 */
export class DatabaseSchemaService {
  private _isInitializingTables = false;
  private static isCreatingTables = false;

  constructor(
    private dbManager: MultiDatabaseManager,
    private _seedService: DatabaseSeedService
  ) {}

  /** Check if tables are currently being initialized */
  get isInitializingTables(): boolean {
    return this._isInitializingTables;
  }

  /** Set the initializing tables flag */
  setInitializingTables(value: boolean): void {
    this._isInitializingTables = value;
  }

  /**
   * Initialize all database tables (full initialization)
   */
  async initializeTables(): Promise<void> {
    // Prevent recursive calls
    if (this.isInitializingTables) {
      console.log("⚠️  Table initialization already in progress, skipping...");
      return;
    }

    this.setInitializingTables(true);
    try {
      // Initialize MAIN database tables only
      // Admin Users Table (main DB)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('master_admin', 'admin', 'developer')),
          access_level TEXT NOT NULL CHECK (access_level IN ('full', 'read_write', 'read_only')),
          permissions TEXT DEFAULT '[]',
          scopes TEXT DEFAULT '[]',
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_login TEXT,
          login_count INTEGER DEFAULT 0,
          api_key TEXT UNIQUE
        )
      `);

      // API Keys Table (admin/system level in main DB)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          name TEXT,
          type TEXT DEFAULT 'admin',
          owner_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
          scopes TEXT DEFAULT '[]',
          project_ids TEXT DEFAULT '[]',
          expires_at TEXT,
          rate_limit INTEGER,
          metadata TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_used_at TEXT,
          usage_count INTEGER DEFAULT 0
        )
      `);

      // Create indexes for API keys (SQLite partial indexes use different syntax)
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE is_active = 1
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_id)
      `);

      // Projects Table (metadata only in main DB)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          owner_id TEXT NOT NULL REFERENCES admin_users(id),
          api_key TEXT UNIQUE NOT NULL,
          project_url TEXT,
          allowed_origins TEXT DEFAULT '[]',
          settings TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          storage_used INTEGER DEFAULT 0,
          api_calls_count INTEGER DEFAULT 0,
          last_api_call TEXT,
          created_by TEXT NOT NULL REFERENCES admin_users(id)
        )
      `);

      // Project Admins Table (for admin users accessing projects - MAIN DB)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS project_admins (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, admin_user_id)
        )
      `);

      // Sessions Table (main DB)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          user_id TEXT NOT NULL,
          project_id TEXT REFERENCES projects(id),
          type TEXT CHECK (type IN ('admin', 'project')),
          user_type TEXT CHECK (user_type IN ('admin', 'project')),
          scopes TEXT NOT NULL DEFAULT '[]',
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          expires_at TEXT NOT NULL,
          consumed INTEGER DEFAULT 0,
          consumed_at TEXT,
          last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
          last_used_at TEXT DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1,
          ip_address TEXT,
          user_agent TEXT
        )
      `);

      // Migration: Add user_type column to existing sessions table if it doesn't exist
      await this.migrateSessionsTable();

      // Create index for sessions
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)
      `);

      // Email Templates Table (main DB - shared templates)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS email_templates (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          variables TEXT DEFAULT '[]',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // System checks table (main DB)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS system_checks (
          id TEXT PRIMARY KEY,
          check_type TEXT NOT NULL,
          status TEXT NOT NULL,
          details TEXT DEFAULT '{}',
          last_checked TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(check_type)
        )
      `);

      // System secrets table (main DB) - stores encrypted secrets like encryption keys
      // eslint-disable-next-line no-warning-comments
      // TODO: MIGRATE TO SDK - This table should be managed by SDK's system module
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS system_secrets (
          id TEXT PRIMARY KEY,
          key_name TEXT UNIQUE NOT NULL,
          encrypted_value TEXT NOT NULL,
          encryption_method TEXT DEFAULT 'aes-256-gcm',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT,
          metadata TEXT DEFAULT '{}'
        )
      `);

      // Create index on key_name for fast lookups
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_system_secrets_key_name ON system_secrets(key_name)
      `);

      // Create triggers for updated_at
      await this.createUpdatedAtTriggers();

      // Migrations table (main DB)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Backups table (main DB - tracks backup metadata)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY,
          project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('project', 'system')),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          size INTEGER NOT NULL,
          encrypted INTEGER DEFAULT 0,
          version TEXT DEFAULT '2.0.0',
          description TEXT,
          file_path TEXT NOT NULL,
          snapshot_id TEXT,
          unique_size INTEGER,
          file_count INTEGER
        )
      `);

      // Create index for backups
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_backups_project ON backups(project_id)
      `);

      // Activity Logs Table (main DB - for system-wide activity logging)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          user_type TEXT CHECK (user_type IN ('admin', 'project', 'system')),
          project_id TEXT,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id TEXT,
          details TEXT DEFAULT '{}',
          metadata TEXT DEFAULT '{}',
          ip_address TEXT,
          user_agent TEXT,
          session_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for activity_logs (performance optimization)
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON activity_logs(project_id)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC)
      `);
      
      // Additional performance indexes for main database
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email)
      `);

      // Seed default data after tables are created
      await this._seedService.seedDefaultData();

      // Reset initialization flag after successful completion
      this.setInitializingTables(false);
    } catch (error) {
      // Reset initialization flag even on error
      this.setInitializingTables(false);

      console.error("Error during table initialization:", error);
      console.error(
        "Table initialization error occurred. Data is safe - tables were not dropped."
      );
      console.error(
        "If schema changes are needed, use migrations or manual database updates."
      );

      throw error;
    }
  }

  /**
   * Create only essential tables for development
   */
  async createEssentialTables(): Promise<boolean> {
    // Prevent multiple simultaneous calls
    if (DatabaseSchemaService.isCreatingTables) {
      console.log("⚠️ Table creation already in progress, skipping...");
      return false;
    }

    DatabaseSchemaService.isCreatingTables = true;
    try {
      // Ensure main database is connected
      await this.dbManager.connectMain();

      // Only create the most essential tables with SQLite-compatible syntax
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('master_admin', 'admin', 'developer')),
          access_level TEXT NOT NULL CHECK (access_level IN ('full', 'read_write', 'read_only')),
          permissions TEXT DEFAULT '[]',
          scopes TEXT DEFAULT '[]',
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_login TEXT,
          login_count INTEGER DEFAULT 0,
          api_key TEXT UNIQUE
        )
      `);

      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          owner_id TEXT NOT NULL REFERENCES admin_users(id),
          api_key TEXT UNIQUE NOT NULL,
          project_url TEXT,
          allowed_origins TEXT DEFAULT '[]',
          settings TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          storage_used INTEGER DEFAULT 0,
          api_calls_count INTEGER DEFAULT 0,
          last_api_call TEXT,
          created_by TEXT NOT NULL REFERENCES admin_users(id)
        )
      `);

      // Add missing essential tables for auth system (main database)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          user_id TEXT NOT NULL,
          project_id TEXT REFERENCES projects(id),
          type TEXT CHECK (type IN ('admin', 'project')),
          user_type TEXT CHECK (user_type IN ('admin', 'project')),
          scopes TEXT NOT NULL DEFAULT '[]',
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          expires_at TEXT NOT NULL,
          consumed INTEGER DEFAULT 0,
          consumed_at TEXT,
          last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
          last_used_at TEXT DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1,
          ip_address TEXT,
          user_agent TEXT
        )
      `);

      // Migration: Ensure user_type column exists (for SDK compatibility)
      await this.migrateSessionsTable();
      
      // Migration: Ensure last_used_at column exists (for SDK compatibility)
      // Check if column exists, add if missing
      const sessionColumns = await this.dbManager.queryMain(
        `PRAGMA table_info(sessions)`
      );
      const existingSessionColumns = (
        sessionColumns.rows as Array<{ name: string }>
      ).map((row) => row.name);
      
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
        console.log("✅ Added missing 'last_used_at' column to sessions table (SDK compatibility)");
      }

      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          name TEXT,
          type TEXT DEFAULT 'admin',
          owner_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
          scopes TEXT DEFAULT '[]',
          project_ids TEXT DEFAULT '[]',
          expires_at TEXT,
          rate_limit INTEGER,
          metadata TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_used_at TEXT,
          usage_count INTEGER DEFAULT 0
        )
      `);

      // Backups table (main DB) - CRITICAL for backup functionality
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY,
          project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('project', 'system')),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          size INTEGER NOT NULL,
          encrypted INTEGER DEFAULT 0,
          version TEXT DEFAULT '2.0.0',
          description TEXT,
          file_path TEXT NOT NULL,
          snapshot_id TEXT,
          unique_size INTEGER,
          file_count INTEGER
        )
      `);

      // Create index for backups
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_backups_project ON backups(project_id)
      `);

      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Activity Logs Table (main DB - for system-wide activity logging)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          user_type TEXT CHECK (user_type IN ('admin', 'project', 'system')),
          project_id TEXT,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id TEXT,
          details TEXT DEFAULT '{}',
          metadata TEXT DEFAULT '{}',
          ip_address TEXT,
          user_agent TEXT,
          session_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for activity_logs
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)
      `);
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON activity_logs(project_id)
      `);

      console.log("✅ Essential tables and admin user created");
      return true;
    } finally {
      DatabaseSchemaService.isCreatingTables = false;
    }
  }

  /**
   * Migrate sessions table to add user_type column
   */
  private async migrateSessionsTable(): Promise<void> {
    try {
      // Check if table exists first
      const tableExists = await this.dbManager.queryMain(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'
      `);

      if (tableExists.rows.length > 0) {
        // Table exists, check if column exists
        const tableInfo = await this.dbManager.queryMain(
          `PRAGMA table_info(sessions)`
        );
        const columns = (tableInfo.rows as Array<{ name: string }>).map(
          (row) => row.name
        );

        if (!columns.includes("user_type")) {
          try {
            await this.dbManager.queryMain(`
              ALTER TABLE sessions ADD COLUMN user_type TEXT CHECK (user_type IN ('admin', 'project'))
            `);
            // Update existing rows to set user_type = type
            await this.dbManager.queryMain(`
              UPDATE sessions SET user_type = type WHERE user_type IS NULL
            `);
            console.log(
              "✅ Added 'user_type' column to sessions table (SDK compatibility)"
            );
          } catch (alterError) {
            // Column might have been added by another process - check again
            const errorMsg =
              alterError instanceof Error
                ? alterError.message
                : String(alterError);
            if (errorMsg.includes("duplicate column")) {
              // Column already exists - silently ignore (race condition)
              // Verify it exists now
              const recheckInfo = await this.dbManager.queryMain(
                `PRAGMA table_info(sessions)`
              );
              const recheckColumns = (
                recheckInfo.rows as Array<{ name: string }>
              ).map((row) => row.name);
              if (recheckColumns.includes("user_type")) {
                // Column exists now - update existing rows if needed
                await this.dbManager
                  .queryMain(
                    `
                    UPDATE sessions SET user_type = type WHERE user_type IS NULL
                  `
                  )
                  .catch(() => {
                    // Ignore update errors
                  });
              }
            } else {
              // Unexpected error - rethrow
              throw alterError;
            }
          }
        } else {
          // Column already exists - update existing rows if needed
          await this.dbManager
            .queryMain(
              `
              UPDATE sessions SET user_type = type WHERE user_type IS NULL
            `
            )
            .catch(() => {
              // Ignore update errors
            });
        }
      }
      // If table doesn't exist yet, CREATE TABLE will include user_type, so no migration needed
    } catch (error) {
      // Only log unexpected errors (not duplicate column errors)
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        !errorMsg.includes("duplicate column") &&
        !errorMsg.includes("duplicate column name")
      ) {
        console.warn(`⚠️  Failed to add user_type column: ${errorMsg}`);
      }
    }
  }

  /**
   * Create triggers for updated_at columns
   */
  private async createUpdatedAtTriggers(): Promise<void> {
    const tablesWithUpdatedAt = ["admin_users", "projects", "email_templates"];
    for (const table of tablesWithUpdatedAt) {
      // Drop trigger if exists (ignore errors if it doesn't exist)
      try {
        await this.dbManager.queryMain(
          `DROP TRIGGER IF EXISTS update_${table}_updated_at`
        );
      } catch {
        // Ignore errors if trigger doesn't exist
      }

      // Create trigger (separate query)
      await this.dbManager.queryMain(`
        CREATE TRIGGER update_${table}_updated_at 
        AFTER UPDATE ON ${table}
        BEGIN
          UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE rowid = NEW.rowid;
        END
      `);
    }
  }
}
