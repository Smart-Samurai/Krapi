import * as crypto from "crypto";

import { ApiKeyScope, FieldType } from "@krapi/sdk";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import { MigrationService } from "./migration.service";
import { SQLiteAdapter } from "./sqlite-adapter.service";
import { MultiDatabaseManager } from "./multi-database-manager.service";

import {
  AdminUser,
  AdminRole,
  AccessLevel,
  Document,
  FileRecord,
  SessionType,
  BackendSession,
  Collection,
  CollectionField,
  CollectionIndex,
  Scope,
  BackendChangelogEntry,
  CreateBackendChangelogEntry,
  BackendApiKey,
  BackendProject,
  BackendProjectSettings,
  BackendProjectUser,
  QueryOptions,
  UserRole,
} from "@/types";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";

export class DatabaseService {
  private adapter: SQLiteAdapter; // Keep for backward compatibility during migration
  private dbManager: MultiDatabaseManager;
  private static instance: DatabaseService;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 10;
  private migrationService: MigrationService;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private lastHealthCheck: Date | null = null;
  private healthCheckInterval = 300000; // 5 minutes - reduce frequency to avoid conflicts

  private constructor() {
    // Create the ready promise
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    // Initialize multi-database manager
    const mainDbPath = process.env.DB_PATH || process.env.SQLITE_DB_PATH || undefined;
    const projectsDbDir = process.env.PROJECTS_DB_DIR || undefined;
    this.dbManager = new MultiDatabaseManager(mainDbPath, projectsDbDir);

    // SQLite database configuration (keep for backward compatibility)
    const dbPath = process.env.DB_PATH || process.env.SQLITE_DB_PATH;
    this.adapter = new SQLiteAdapter(dbPath);

    // In development mode, skip heavy initialization for faster startup
    if (process.env.NODE_ENV === "development") {
      console.log("🚀 Development mode: Using instant database initialization");
      this.initializeInstant().catch((error) => {
        console.error("Instant database initialization failed:", error);
        // Fall back to ultra-fast initialization if instant fails
        console.log("🔄 Falling back to ultra-fast initialization...");
        this.initializeUltraFast().catch((fallbackError) => {
          console.error(
            "Ultra-fast initialization also failed:",
            fallbackError
          );
          // Final fallback to fast initialization
          console.log("🔄 Final fallback to fast initialization...");
          this.initializeFast().catch((finalError) => {
            console.error("All initialization methods failed:", finalError);
            this.readyReject(finalError);
          });
        });
      });
    } else {
      // Production mode: full initialization with retry
      this.initializeWithRetry().catch((error) => {
        console.error("Database initialization failed:", error);
        this.readyReject(error);
      });
    }
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Public method to wait for database to be ready
  async waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  // Public method to get a database connection (for compatibility, returns adapter)
  async getConnection() {
    return this.adapter;
  }

  // Public method to execute queries (defaults to main database for backward compatibility)
  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    // For backward compatibility, route to main database
    return await this.dbManager.queryMain(sql, params);
  }

  // Query main database (admin/app data)
  async queryMain(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    return await this.dbManager.queryMain(sql, params);
  }

  // Query project-specific database
  async queryProject(
    projectId: string,
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    if (!projectId) {
      throw new Error("Project ID is required for project database queries");
    }
    return await this.dbManager.queryProject(projectId, sql, params);
  }

  // Method to implement DatabaseConnection interface
  async connect(): Promise<void> {
    await this.ensureReady();
  }

  // Method to implement DatabaseConnection interface
  async end(): Promise<void> {
    await this.close();
  }

  async runSchemaFixes(): Promise<void> {
    // Migration service still uses adapter for backward compatibility
    // TODO: Update migration service to work with multi-database manager
    if (!this.migrationService) {
      // Initialize migration service if not already initialized
      this.migrationService = new MigrationService(this.adapter);
    }
    await this.migrationService.checkAndFixSchema();
  }

  // Check if database is ready (non-blocking)
  isReady(): boolean {
    return this.isConnected;
  }

  // Health check method
  async checkHealth(): Promise<{
    healthy: boolean;
    message: string;
    details?: {
      missingTables?: string[];
      lastCheck?: Date;
      connectionPool?: {
        totalCount: number;
        idleCount: number;
        waitingCount: number;
      };
      error?: string;
    };
  }> {
    try {
      // Check main database connection
      await this.dbManager.queryMain("SELECT 1");

      // Check critical tables in main database (SQLite uses sqlite_master instead of information_schema)
      const criticalTables = [
        "admin_users",
        "projects",
        "sessions",
        "api_keys",
        "migrations",
      ];

      const missingTables = [];
      for (const table of criticalTables) {
        const result = await this.dbManager.queryMain(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          [table]
        );
        if (result.rows.length === 0) {
          missingTables.push(table);
        }
      }

      // Note: collections, documents, files, changelog are in project-specific databases
      // They will be checked when projects are accessed

      if (missingTables.length > 0) {
        return {
          healthy: false,
          message: "Missing critical tables",
          details: { missingTables },
        };
      }

      this.lastHealthCheck = new Date();
      return {
        healthy: true,
        message: "Database is healthy",
        details: {
          lastCheck: this.lastHealthCheck,
          connectionPool: {
            totalCount: 1,
            idleCount: 1,
            waitingCount: 0,
          },
        },
      };
    } catch (error) {
      return {
        healthy: false,
        message: "Database health check failed",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // Auto-repair database
  async autoRepair(): Promise<{
    success: boolean;
    message: string;
    repairs?: string[];
  }> {
    const repairs: string[] = [];

    try {
      console.log("Starting database auto-repair...");

      // Check health first
      const health = await this.checkHealth();
      if (health.healthy) {
        return {
          success: true,
          message: "Database is healthy, no repairs needed",
        };
      }

      // Re-initialize tables if needed
      if (health.details?.missingTables?.length > 0) {
        console.log("Re-initializing missing tables...");
        if (process.env.NODE_ENV === "development") {
          await this.createEssentialTables();
        } else {
          await this.initializeTables();
        }
        repairs.push("Re-initialized missing tables");
      }

      // Skip migrations for fresh database (test environment)
      console.log("Skipping migrations for fresh database...");
      repairs.push("Skipped migrations (fresh database)");

      // Initialize tables directly instead of running migrations
      console.log("Initializing tables directly...");
      if (process.env.NODE_ENV === "development") {
        await this.createEssentialTables();
      } else {
        await this.initializeTables();
      }
      repairs.push("Initialized tables directly");

      // Fix missing columns
      console.log("Checking and fixing missing columns...");
      await this.fixMissingColumns();
      repairs.push("Fixed missing columns");

      // Create default admin if none exists
      const adminCount = await this.dbManager.queryMain(
        "SELECT COUNT(*) as count FROM admin_users"
      );
      if (parseInt(String(adminCount.rows[0]?.count || 0)) === 0) {
        await this.createDefaultAdmin();
        repairs.push("Created default admin user");
      }

      return {
        success: true,
        message: "Database repaired successfully",
        repairs,
      };
    } catch (error) {
      console.error("Auto-repair failed:", error);
      return {
        success: false,
        message: "Failed to repair database",
        repairs,
      };
    }
  }

  // Ensure database is ready before operations
  private async ensureReady(): Promise<void> {
    if (!this.isConnected) {
      // In development mode, don't block on table creation
      if (process.env.NODE_ENV === "development") {
        console.log(
          "🚀 Development mode: Allowing operations while tables are being created"
        );
        return; // Don't wait for tables to be fully created
      }
      await this.waitForReady();
    }

    // DISABLED: Periodic health check during normal operations to prevent deadlocks
    // Only run health checks on-demand via explicit API calls
    // The frequent health checks during normal operations were causing deadlocks
    // and performance issues during testing
  }

  private async initializeWithRetry() {
    while (
      this.connectionAttempts < this.maxConnectionAttempts &&
      !this.isConnected
    ) {
      this.connectionAttempts++;
      console.log(
        `Attempting to connect to SQLite (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})...`
      );

      try {
        // Connect to main database
        await this.dbManager.connectMain();

        // Test the connection
        await this.dbManager.queryMain("SELECT 1");

        this.isConnected = true;
        console.log("Successfully connected to main SQLite database");

        // Initialize main database tables first
        if (process.env.NODE_ENV === "development") {
          await this.createEssentialTables();
        } else {
          await this.initializeTables();
        }

        // Skip migrations for fresh database (test environment)
        console.log("Skipping migrations - using direct table initialization");

        // Resolve the ready promise on successful initialization
        this.readyResolve();
        break;
      } catch (error) {
        console.error(
          `Failed to connect to SQLite (attempt ${this.connectionAttempts}):`,
          error
        );

        if (this.connectionAttempts < this.maxConnectionAttempts) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.min(
            1000 * Math.pow(2, this.connectionAttempts - 1),
            10000
          );
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          console.error(
            "Max connection attempts reached. Please ensure SQLite database is accessible."
          );
          const connectionError = new Error(
            "Failed to connect to SQLite database after multiple attempts"
          );
          this.readyReject(connectionError);
          throw connectionError;
        }
      }
    }
  }

  private async initializeTables() {
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

      // Project Users Table (for admin access to projects - main DB)
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
          user_id TEXT REFERENCES admin_users(id),
          project_id TEXT REFERENCES projects(id),
          type TEXT NOT NULL CHECK (type IN ('admin', 'project')),
          scopes TEXT NOT NULL DEFAULT '[]',
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          expires_at TEXT NOT NULL,
          consumed INTEGER DEFAULT 0,
          consumed_at TEXT,
          last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1
        )
      `);

      // Create index for sessions
      await this.dbManager.queryMain(`
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)
      `);

      // Note: Changelog is stored in project-specific databases
      // It is initialized when a project database is first accessed

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

      // Create triggers for updated_at (SQLite doesn't support functions, triggers directly)
      const tablesWithUpdatedAt = [
        "admin_users",
        "projects",
        "email_templates",
      ];
      for (const table of tablesWithUpdatedAt) {
        await this.dbManager.queryMain(`
          DROP TRIGGER IF EXISTS update_${table}_updated_at;
          CREATE TRIGGER update_${table}_updated_at 
          AFTER UPDATE ON ${table}
          BEGIN
            UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE rowid = NEW.rowid;
          END;
        `);
      }

      // Migrations table (main DB)
      await this.dbManager.queryMain(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // SQLite auto-commits, no need for explicit COMMIT

      // Repair database structure if needed
      await this.repairDatabase();

      // Seed default data after tables are created
      await this.seedDefaultData();
    } catch (error) {
      // SQLite handles rollback automatically on error

      // Log more detailed error information
      console.error("Error during table initialization:", error);

      // Check if it's a specific PostgreSQL error
      if (error instanceof Error && "code" in error) {
        const pgError = error as Error & { code: string };

        // If it's a "column does not exist" error, it might mean tables are partially created
        if (pgError.code === "42703") {
          console.log(
            "Tables might be partially created. Attempting to drop and recreate..."
          );

          try {
            // SQLite doesn't need explicit BEGIN

            // Drop tables in reverse order of dependencies
            const tablesToDrop = [
              "audit_logs",
              "system_checks",
              "sessions",
              "documents",
              "collections",
              "project_admins",
              "project_users",
              "projects",
              "api_keys",
              "admin_users",
            ];

            for (const table of tablesToDrop) {
              await this.adapter.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            }

            // Drop the trigger function
            await this.adapter.query(
              `DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`
            );

            // SQLite auto-commits

            console.log(
              "Cleaned up existing tables. Please restart the application."
            );
          } catch (cleanupError) {
            // SQLite handles rollback automatically
            console.error("Failed to clean up tables:", cleanupError);
          }
        }
      }

      throw error;
    } finally {
      // SQLite doesn't need connection release
    }
  }

  private async seedDefaultData() {
    try {
      // Check if master admin exists (in main DB)
      const result = await this.dbManager.queryMain(
        "SELECT id FROM admin_users WHERE username = $1",
        ["admin"]
      );

      let adminId: string;
      let masterApiKey: string;

      if (result.rows.length === 0) {
        // Create default master admin with API key
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
        // SQLite doesn't support RETURNING, so use the generated ID
      } else {
        adminId = result.rows[0]?.id as string;

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
      if (masterApiKey) {
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

  // Health check methods
  async performHealthCheck(): Promise<{
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
  }> {
    const checks = {
      database: { status: false, message: "Not checked" },
      tables: {
        status: false,
        message: "Not checked",
        missing: [] as string[],
      },
      defaultAdmin: { status: false, message: "Not checked" },
      initialization: { status: false, message: "Not checked", details: {} },
    };

    try {
      // Check database connection (main DB)
      try {
        await this.dbManager.queryMain("SELECT 1");
        checks.database = { status: true, message: "Connected" };
      } catch (error) {
        checks.database = {
          status: false,
          message: `Connection failed: ${error}`,
        };
      }

      // Check required tables exist
      const requiredTables = [
        "admin_users",
        "projects",
        "project_admins",
        "project_users",
        "collections",
        "documents",
        "files",
        "sessions",
        "changelog",
        "system_checks",
        "api_keys",
      ];

      try {
        // SQLite uses sqlite_master instead of information_schema
        // Check each table individually (main DB tables)
        const foundTables: string[] = [];
        for (const table of requiredTables) {
          const result = await this.dbManager.queryMain(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [table]
          );
          if (result.rows.length > 0) {
            foundTables.push(table);
          }
        }
        const tableCheckResult = { rows: foundTables.map((t) => ({ table_name: t })) };

        const existingTables = tableCheckResult.rows.map(
          (row) => row.table_name
        );
        const missingTables = requiredTables.filter(
          (table) => !existingTables.includes(table)
        );

        if (missingTables.length === 0) {
          checks.tables = {
            status: true,
            message: "All required tables exist",
            missing: [],
          };
        } else {
          checks.tables = {
            status: false,
            message: `Missing tables: ${missingTables.join(", ")}`,
            missing: missingTables,
          };
        }
      } catch (error) {
        checks.tables = {
          status: false,
          message: `Table check failed: ${error}`,
          missing: [],
        };
      }

      // Check default admin exists and is active (main DB)
      try {
        const adminResult = await this.dbManager.queryMain(
          "SELECT id, is_active FROM admin_users WHERE username = $1",
          ["admin"]
        );

        if (adminResult.rows.length > 0 && (adminResult.rows[0] as { is_active: unknown })?.is_active) {
          checks.defaultAdmin = {
            status: true,
            message: "Default admin exists and is active",
          };
        } else if (adminResult.rows.length > 0) {
          checks.defaultAdmin = {
            status: false,
            message: "Default admin exists but is inactive",
          };
        } else {
          checks.defaultAdmin = {
            status: false,
            message: "Default admin does not exist",
          };
        }
      } catch (error) {
        checks.defaultAdmin = {
          status: false,
          message: `Admin check failed: ${error}`,
        };
      }

      // Check initialization status (main DB)
      try {
        const initResult = await this.dbManager.queryMain(
          `SELECT status, details, last_checked 
           FROM system_checks 
           WHERE check_type = 'database_initialization'`
        );

        if (
          initResult.rows.length > 0 &&
          (initResult.rows[0] as { status: string })?.status === "success"
        ) {
          const initRow = initResult.rows[0] as { status: string; details: unknown };
          checks.initialization = {
            status: true,
            message: "Database properly initialized",
            details: initRow.details as Record<string, unknown>,
          };
        } else {
          checks.initialization = {
            status: false,
            message: "Database not properly initialized",
            details: {},
          };
        }
      } catch {
        // Table might not exist yet
        checks.initialization = {
          status: false,
          message: "Initialization check not available",
          details: {},
        };
      }

      // Determine overall status
      const allHealthy = Object.values(checks).every((check) => check.status);
      const hasUnhealthy = Object.values(checks).some((check) => !check.status);

      return {
        status: allHealthy
          ? "healthy"
          : hasUnhealthy
          ? "unhealthy"
          : "degraded",
        checks,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: "unhealthy",
        checks,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Repair database issues found during health check
  async repairDatabase(): Promise<{ success: boolean; actions: string[] }> {
    const actions: string[] = [];

    try {
      // Run health check first
      const health = await this.performHealthCheck();

      // Fix missing tables
      if (!health.checks.tables.status && health.checks.tables.missing) {
        console.log("Repairing: Creating missing tables...");
        await this.initializeTables();
        actions.push("Created missing tables");
      }

      // Fix missing columns in existing tables
      await this.fixMissingColumns();
      actions.push("Fixed missing columns");

      // Fix default admin
      if (!health.checks.defaultAdmin.status) {
        await this.seedDefaultData();
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

  private async fixMissingColumns(): Promise<void> {
    try {
      // Check and add missing columns to sessions table (SQLite uses PRAGMA table_info) - main DB
      const sessionColumns = await this.dbManager.queryMain(`PRAGMA table_info(sessions)`);
      const existingSessionColumns = (sessionColumns.rows as Array<{ name: string }>).map(
        (row) => row.name
      );

      // Add consumed column if it doesn't exist
      if (!existingSessionColumns.includes("consumed")) {
        await this.dbManager.queryMain(`
          ALTER TABLE sessions 
          ADD COLUMN consumed INTEGER DEFAULT 0
        `);
        console.log("Added missing 'consumed' column to sessions table");
      }

      // Add consumed_at column if it doesn't exist
      if (!existingSessionColumns.includes("consumed_at")) {
        await this.dbManager.queryMain(`
          ALTER TABLE sessions 
          ADD COLUMN consumed_at TEXT
        `);
        console.log("Added missing 'consumed_at' column to sessions table");
      }

      // Check and add missing columns to projects table - main DB
      const projectColumns = await this.dbManager.queryMain(`PRAGMA table_info(projects)`);
      const existingProjectColumns = (projectColumns.rows as Array<{ name: string }>).map(
        (row) => row.name
      );

      // Add is_active column if it doesn't exist
      if (!existingProjectColumns.includes("is_active")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects 
          ADD COLUMN is_active INTEGER DEFAULT 1
        `);
        console.log("Added missing 'is_active' column to projects table");
      }

      // Add created_by column if it doesn't exist
      if (!existingProjectColumns.includes("created_by")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects 
          ADD COLUMN created_by TEXT REFERENCES admin_users(id)
        `);
        console.log("Added missing 'created_by' column to projects table");
      }

      // Add settings column if it doesn't exist
      if (!existingProjectColumns.includes("settings")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects 
          ADD COLUMN settings TEXT DEFAULT '{}'
        `);
        console.log("Added missing 'settings' column to projects table");
      }

      // Add storage_used column if it doesn't exist
      if (!existingProjectColumns.includes("storage_used")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects 
          ADD COLUMN storage_used INTEGER DEFAULT 0
        `);
        console.log("Added missing 'storage_used' column to projects table");
      }

      // Add api_calls_count column if it doesn't exist
      if (!existingProjectColumns.includes("api_calls_count")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects 
          ADD COLUMN api_calls_count INTEGER DEFAULT 0
        `);
        console.log("Added missing 'api_calls_count' column to projects table");
      }

      // Add last_api_call column if it doesn't exist
      if (!existingProjectColumns.includes("last_api_call")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects 
          ADD COLUMN last_api_call TEXT
        `);
        console.log("Added missing 'last_api_call' column to projects table");
      }

      // Add project_url column if it doesn't exist
      if (!existingProjectColumns.includes("project_url")) {
        await this.dbManager.queryMain(`
          ALTER TABLE projects 
          ADD COLUMN project_url TEXT
        `);
        console.log("Added missing 'project_url' column to projects table");
      }

      // Check and add missing columns to admin_users table - main DB
      const adminUserColumns = await this.dbManager.queryMain(`PRAGMA table_info(admin_users)`);

      const existingAdminUserColumns = (adminUserColumns.rows as Array<{ name: string }>).map(
        (row) => row.name
      );

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

      // Note: Removed user_type backward compatibility code - now using 'type' column directly
      // Note: Collections, documents, files, project_users, changelog, project api_keys are in project DBs
      // They will be initialized when project databases are first accessed
    } catch (error) {
      console.error("Error fixing missing columns:", error);
    }
  }

  // Admin User Management (admin users are stored in main database)
  async createAdminUser(
    data: Omit<
      AdminUser,
      "id" | "createdAt" | "updatedAt" | "lastLogin" | "loginCount"
    > & { password?: string }
  ): Promise<AdminUser> {
    await this.ensureReady();
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

    return this.mapAdminUser(result.rows[0]);
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users WHERE username = $1",
      [username]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users WHERE email = $1",
      [email]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAdminUserById(id: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users WHERE id = $1",
      [id]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAdminUserByApiKey(apiKey: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users WHERE api_key = $1 AND is_active = 1",
      [apiKey]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM admin_users ORDER BY created_at DESC"
    );

    return result.rows.map((row) => this.mapAdminUser(row));
  }

  async updateAdminUserPassword(
    id: string,
    passwordHash: string
  ): Promise<AdminUser | null> {
    await this.ensureReady();
    // SQLite doesn't support RETURNING *, so update and query back separately
    await this.dbManager.queryMain(
      "UPDATE admin_users SET password_hash = $1 WHERE id = $2",
      [passwordHash, id]
    );

    // Query back the updated row
    return this.getAdminUserById(id);
  }

  async updateAdminUserApiKey(
    id: string,
    apiKey: string
  ): Promise<AdminUser | null> {
    await this.ensureReady();
    // SQLite doesn't support RETURNING *, so update and query back separately
    await this.dbManager.queryMain(
      "UPDATE admin_users SET api_key = $1 WHERE id = $2",
      [apiKey, id]
    );

    // Query back the updated row
    return this.getAdminUserById(id);
  }

  async updateAdminUser(
    id: string,
    data: Partial<AdminUser>
  ): Promise<AdminUser | null> {
    await this.ensureReady();
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
      `UPDATE admin_users SET ${fields.join(
        ", "
      )} WHERE id = $${paramCount}`,
      values
    );

    // Query back the updated row
    return this.getAdminUserById(id);
  }

  async updateLoginInfo(id: string): Promise<void> {
    await this.ensureReady();
    await this.dbManager.queryMain(
      `UPDATE admin_users 
       SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 
       WHERE id = $1`,
      [id]
    );
  }

  // Admin account management methods
  async enableAdminAccount(adminUserId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "UPDATE admin_users SET is_active = 1 WHERE id = $1",
      [adminUserId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async disableAdminAccount(adminUserId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "UPDATE admin_users SET is_active = 0 WHERE id = $1",
      [adminUserId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getAdminAccountStatus(
    adminUserId: string
  ): Promise<{ is_active: boolean } | null> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT is_active FROM admin_users WHERE id = $1",
      [adminUserId]
    );
    return result.rows.length > 0
      ? (result.rows[0] as { is_active: boolean })
      : null;
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "DELETE FROM admin_users WHERE id = $1",
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async verifyAdminPassword(
    username: string,
    password: string
  ): Promise<AdminUser | null> {
    await this.ensureReady();
    const user = await this.getAdminUserByUsername(username);
    if (!user || !user.active) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    await this.updateLoginInfo(user.id);
    return user;
  }

  // Project Methods
  async createProject(
    data: Omit<
      BackendProject,
      | "id"
      | "created_at"
      | "updated_at"
      | "storage_used"
      | "total_api_calls"
      | "last_api_call"
    >
  ): Promise<BackendProject> {
    try {
      // Validate required fields
      if (!data.created_by) {
        throw new Error("created_by is required to create a project");
      }

      const apiKey = data.api_key || `pk_${uuidv4().replace(/-/g, "")}`;

      // Generate project ID (SQLite doesn't support RETURNING *)
      const projectId = uuidv4();
      
      // Insert into main database (project metadata)
      await this.dbManager.queryMain(
        `INSERT INTO projects (id, name, description, project_url, api_key, is_active, created_by, settings, owner_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          projectId,
          data.name,
          data.description || null,
          data.project_url || null,
          apiKey,
          data.active ? 1 : 0, // SQLite uses INTEGER 1/0 for booleans
          data.created_by, // Required - should be provided by controller
          JSON.stringify(data.settings || {}),
          data.created_by, // owner_id defaults to created_by
        ]
      );

      // Initialize project database (will be created on first access)
      // Just ensure it exists for future queries
      await this.dbManager.getProjectDb(projectId);

      // Query back the inserted row (SQLite doesn't support RETURNING *)
      const rows = await this.dbManager.queryMain(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );

      return this.mapProject(rows[0]);
    } catch (error) {
      console.error("Failed to create project:", error);
      // Check if it's a schema issue (missing column)
      if (error instanceof Error && error.message.includes("column")) {
        // Fix missing columns directly (more targeted than full autoRepair)
        await this.fixMissingColumns();
        // Retry after repair
        return this.createProject(data);
      }
      throw error;
    }
  }

  async getProjectById(id: string): Promise<BackendProject | null> {
    try {
      // Use validation utilities
      const sanitizedId = sanitizeProjectId(id);
      if (!sanitizedId) {
        console.warn(`Invalid project ID: ${id} - ID is empty or invalid`);
        return null;
      }

      if (!isValidProjectId(sanitizedId)) {
        console.warn(`Invalid project ID format: ${sanitizedId}`);
        return null;
      }

      const rows = await this.dbManager.queryMain(
        `SELECT * FROM projects WHERE id = $1`,
        [sanitizedId]
      );

      return rows.rows.length > 0
        ? this.mapProject(rows.rows[0] as unknown as Record<string, unknown>)
        : null;
    } catch (error) {
      console.error("Failed to get project by ID:", error);
      throw error;
    }
  }

  async getProjectByApiKey(apiKey: string): Promise<BackendProject | null> {
    await this.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM projects WHERE api_key = $1 AND is_active = true",
      [apiKey]
    );

    return result.rows.length > 0 ? this.mapProject(result.rows[0]) : null;
  }

  async getAllProjects(): Promise<BackendProject[]> {
    try {
      const result = await this.dbManager.queryMain(
        `SELECT * FROM projects ORDER BY created_at DESC`
      );
      return result.rows.map((row) => this.mapProject(row as unknown as Record<string, unknown>));
    } catch (error) {
      console.error("Failed to get all projects:", error);
      // Attempt to fix the issue
      await this.autoRepair();
      // Retry once after repair
      const result = await this.dbManager.queryMain(
        `SELECT * FROM projects ORDER BY created_at DESC`
      );
      return result.rows.map((row) => this.mapProject(row as unknown as Record<string, unknown>));
    }
  }

  async updateProject(
    id: string,
    data: Partial<BackendProject>
  ): Promise<BackendProject | null> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.project_url !== undefined) {
        updates.push(`project_url = $${paramCount++}`);
        values.push(data.project_url);
      }
      if (data.active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(data.active ? 1 : 0); // SQLite uses INTEGER 1/0 for booleans
      }
      if (data.settings !== undefined) {
        updates.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(data.settings));
      }

      if (updates.length === 0) {
        return this.getProjectById(id);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      // SQLite doesn't support RETURNING *, so update and query back separately
      await this.dbManager.queryMain(
        `UPDATE projects SET ${updates.join(
          ", "
        )} WHERE id = $${paramCount}`,
        values
      );

      // Query back the updated row
      return this.getProjectById(id);
    } catch (error) {
      console.error("Failed to update project:", error);
      throw error;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      // Delete project-specific data from project database
      if (this.dbManager.projectDbExists(id)) {
        // Delete from project database
        await this.dbManager.queryProject(id, "DELETE FROM documents", []);
        await this.dbManager.queryProject(id, "DELETE FROM collections", []);
        await this.dbManager.queryProject(id, "DELETE FROM project_users", []);
        await this.dbManager.queryProject(id, "DELETE FROM files", []);
        await this.dbManager.queryProject(id, "DELETE FROM changelog", []);
        await this.dbManager.queryProject(id, "DELETE FROM api_keys", []);
        
        // Close and delete project database file
        await this.dbManager.closeProjectDb(id);
        const projectDbPath = this.dbManager.getProjectDbPath(id);
        const fs = await import("fs/promises");
        try {
          await fs.unlink(projectDbPath);
        } catch (error) {
          // Ignore if file doesn't exist
        }
      }

      // Delete project metadata from main database
      const result = await this.dbManager.queryMain(
        "DELETE FROM projects WHERE id = $1",
        [id]
      );

      // SQLite auto-commits
      return result.rowCount > 0;
    } catch (error) {
      // SQLite handles rollback automatically
      console.error("Failed to delete project:", error);
      throw error;
    }
  }

  async regenerateProjectApiKey(id: string): Promise<string | null> {
    const apiKey = `pk_${uuidv4().replace(/-/g, "")}`;

    // Project metadata is in main DB
    await this.dbManager.queryMain(
      "UPDATE projects SET api_key = $1 WHERE id = $2",
      [apiKey, id]
    );

    // Query back the updated row
    const result = await this.dbManager.queryMain(
      "SELECT api_key FROM projects WHERE id = $1",
      [id]
    );

    return result.rows.length > 0 ? (result.rows[0]?.api_key as string) : null;
  }

  async updateProjectStats(
    projectId: string,
    storageChange = 0,
    apiCall = false
  ): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (storageChange !== 0) {
      updates.push(`storage_used = storage_used + $${paramCount++}`);
      values.push(storageChange);
    }

    if (apiCall) {
      updates.push(`api_calls_count = api_calls_count + 1`);
      updates.push(`last_api_call = CURRENT_TIMESTAMP`);
    }

    if (updates.length > 0) {
      values.push(projectId);
      // Project metadata is in main DB
      await this.dbManager.queryMain(
        `UPDATE projects SET ${updates.join(", ")} WHERE id = $${paramCount}`,
        values
      );
    }
  }

  // Project User Methods
  async createProjectUser(
    projectId: string,
    userData: {
      username: string;
      email: string;
      password: string;
      role?: string;
      phone?: string;
      is_verified?: boolean;
      scopes?: string[];
    }
  ): Promise<BackendProjectUser> {
    await this.ensureReady();

    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Project users are stored in project-specific databases
    const userId = uuidv4();
    await this.dbManager.queryProject(
      projectId,
      `INSERT INTO project_users (id, project_id, user_id, email, role, permissions) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        projectId,
        userId, // user_id same as id
        userData.email,
        userData.role || "user",
        JSON.stringify(userData.scopes || []),
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM project_users WHERE id = $1",
      [userId]
    );

    return this.mapProjectUser(result.rows[0]);
  }

  async getProjectUser(
    projectId: string,
    userId: string
  ): Promise<BackendProjectUser | null> {
    await this.ensureReady();
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM project_users WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async getProjectUserById(userId: string): Promise<BackendProjectUser | null> {
    // Without projectId, we need to search all project databases
    // This is inefficient, so throw an error suggesting to use getProjectUser with projectId
    throw new Error("getProjectUserById requires projectId. Use getProjectUser(projectId, userId) instead.");
  }

  async getProjectUserByEmail(
    projectId: string,
    email: string
  ): Promise<BackendProjectUser | null> {
    await this.ensureReady();
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM project_users WHERE project_id = $1 AND email = $2",
      [projectId, email]
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async getProjectUserByUsername(
    projectId: string,
    username: string
  ): Promise<BackendProjectUser | null> {
    // Project users table uses user_id and email, not username
    // This method may need to be adjusted based on the actual schema
    await this.ensureReady();
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM project_users WHERE project_id = $1 AND user_id = $2",
      [projectId, username]
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async getProjectUsers(
    projectId: string,
    options: QueryOptions = {}
  ): Promise<{ users: BackendProjectUser[]; total: number }> {
    await this.ensureReady();
    const { limit = 100, offset = 0, search } = options;

    let whereClause = "WHERE project_id = $1";
    const params: unknown[] = [projectId];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (email LIKE $${++paramCount} OR user_id LIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get total count (from project DB)
    const countResult = await this.dbManager.queryProject(
      projectId,
      `SELECT COUNT(*) as count FROM project_users ${whereClause}`,
      params
    );

    // Get paginated results (from project DB)
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM project_users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    return {
      users: result.rows.map((row) => this.mapProjectUser(row)),
      total: parseInt(String(countResult.rows[0]?.count || 0)),
    };
  }

  async updateProjectUser(
    projectId: string,
    userId: string,
    updates: Partial<BackendProjectUser>
  ): Promise<BackendProjectUser | null> {
    await this.ensureReady();
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
    if (updates.password !== undefined) {
      const hashedPassword = await bcrypt.hash(updates.password, 10);
      fields.push(`password_hash = $${paramCount++}`);
      values.push(hashedPassword);
    }
    if (updates.phone !== undefined) {
      fields.push(`phone = $${paramCount++}`);
      values.push(updates.phone);
    }
    if (updates.is_verified !== undefined) {
      fields.push(`is_verified = $${paramCount++}`);
      values.push(updates.is_verified);
      if (updates.is_verified && updates.email) {
        fields.push(`email_verified_at = CURRENT_TIMESTAMP`);
      }
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }
    if (updates.scopes !== undefined) {
      fields.push(`scopes = $${paramCount++}`);
      values.push(updates.scopes);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`);
      values.push(updates.metadata);
    }

    if (fields.length === 0) return this.getProjectUser(projectId, userId);

    values.push(projectId, userId);
    // Update in project DB
    await this.dbManager.queryProject(
      projectId,
      `UPDATE project_users 
       SET ${fields.join(", ")} 
       WHERE project_id = $${paramCount} AND id = $${paramCount + 1}`,
      values
    );

    // Query back the updated row
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM project_users WHERE project_id = $1 AND id = $2`,
      [projectId, userId]
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async deleteProjectUser(projectId: string, userId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.dbManager.queryProject(
      projectId,
      "DELETE FROM project_users WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // Project user account management methods
  async enableProjectUser(projectId: string, userId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.dbManager.queryProject(
      projectId,
      "UPDATE project_users SET permissions = JSON_SET(permissions, '$.is_active', 'true') WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async disableProjectUser(
    projectId: string,
    userId: string
  ): Promise<boolean> {
    await this.ensureReady();
    const result = await this.dbManager.queryProject(
      projectId,
      "UPDATE project_users SET permissions = JSON_SET(permissions, '$.is_active', 'false') WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getProjectUserStatus(
    projectId: string,
    userId: string
  ): Promise<{ is_active: boolean } | null> {
    await this.ensureReady();
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT permissions FROM project_users WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );
    if (result.rows.length === 0) return null;
    
    const permissions = JSON.parse(result.rows[0].permissions as string || "{}");
    return { is_active: permissions.is_active !== false };
  }

  async authenticateProjectUser(
    projectId: string,
    username: string,
    password: string
  ): Promise<BackendProjectUser | null> {
    // Project users don't have password_hash in the project_users table schema
    // This authentication might need to be handled differently
    // For now, return null as this requires schema changes
    return null;
  }

  async getUserProjects(adminUserId: string): Promise<BackendProject[]> {
    // Get projects where admin user has access (from main DB)
    const result = await this.dbManager.queryMain(
      `SELECT p.* 
       FROM projects p 
       JOIN project_admins pa ON p.id = pa.project_id 
       WHERE pa.admin_user_id = $1 
       ORDER BY p.created_at DESC`,
      [adminUserId]
    );

    return result.rows.map((row) => this.mapProject(row));
  }

  async removeProjectUser(
    projectId: string,
    adminUserId: string
  ): Promise<boolean> {
    // Remove from project_admins table in main DB
    const result = await this.dbManager.queryMain(
      "DELETE FROM project_admins WHERE project_id = $1 AND admin_user_id = $2",
      [projectId, adminUserId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async checkProjectAccess(
    projectId: string,
    adminUserId: string
  ): Promise<boolean> {
    // Check project_admins table in main DB
    const result = await this.dbManager.queryMain(
      "SELECT id FROM project_admins WHERE project_id = $1 AND admin_user_id = $2",
      [projectId, adminUserId]
    );

    return result.rows.length > 0;
  }

  // Collection Methods (new terminology for tables/schemas)
  async createCollection(
    projectId: string,
    collectionName: string,
    schema: {
      description?: string;
      fields: CollectionField[];
      indexes?: CollectionIndex[];
    },
    createdBy: string
  ): Promise<Collection> {
    try {
      // Collections are stored in project-specific databases
      const collectionId = uuidv4();
      await this.dbManager.queryProject(
        projectId,
        `INSERT INTO collections (id, project_id, name, description, fields, indexes, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          collectionId,
          projectId,
          collectionName,
          schema.description || null,
          JSON.stringify(schema.fields),
          JSON.stringify(schema.indexes || []),
          createdBy,
        ]
      );

      // Query back the inserted row
      const result = await this.dbManager.queryProject(
        projectId,
        `SELECT * FROM collections WHERE id = $1`,
        [collectionId]
      );

      return this.mapCollection(result.rows[0]);
    } catch (error) {
      // Check for duplicate collection name error (PostgreSQL error code 23505)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        const duplicateError = new Error(
          "Collection with this name already exists in this project"
        );
        (duplicateError as Error & { code: string; statusCode: number }).code =
          "DUPLICATE_COLLECTION_NAME";
        (
          duplicateError as Error & { code: string; statusCode: number }
        ).statusCode = 409;
        throw duplicateError;
      }

      // Re-throw other errors
      throw error;
    }
  }

  async getCollection(
    projectId: string,
    collectionName: string
  ): Promise<Collection | null> {
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
  }

  async getCollectionById(collectionId: string): Promise<Collection | null> {
    // Need to search across all project databases to find the collection
    // For now, we'll need projectId to be provided or search main DB for collection metadata
    // This is a limitation - we'd need to add a collections lookup table in main DB
    // For now, throw an error suggesting to use getCollection with projectId
    throw new Error("getCollectionById requires projectId. Use getCollection(projectId, collectionName) instead.");
  }

  async getProjectCollections(projectId: string): Promise<Collection[]> {
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM collections WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );

    return result.rows.map((row) => this.mapCollection(row));
  }

  async updateCollection(
    projectId: string,
    collectionName: string,
    schema: {
      description?: string;
      fields?: CollectionField[];
      indexes?: CollectionIndex[];
    }
  ): Promise<Collection | null> {
    // Collections are stored in project-specific databases
    await this.dbManager.queryProject(
      projectId,
      `UPDATE collections 
       SET description = $1, fields = $2, indexes = $3 
       WHERE project_id = $4 AND name = $5`,
      [
        schema.description || null,
        JSON.stringify(schema.fields || []),
        JSON.stringify(schema.indexes || []),
        projectId,
        collectionName,
      ]
    );

    // Query back the updated row
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM collections WHERE project_id = $1 AND name = $2`,
      [projectId, collectionName]
    );

    return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
  }

  async deleteCollection(
    projectId: string,
    collectionName: string
  ): Promise<boolean> {
    try {
      // Get collection ID first
      const collectionResult = await this.dbManager.queryProject(
        projectId,
        "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
        [projectId, collectionName]
      );

      if (collectionResult.rows.length === 0) {
        return false;
      }

      const collectionId = collectionResult.rows[0].id as string;

      // Delete all documents for this collection (CASCADE will handle this, but explicit is better)
      await this.dbManager.queryProject(
        projectId,
        "DELETE FROM documents WHERE collection_id = $1",
        [collectionId]
      );

      // Delete the collection
      const result = await this.dbManager.queryProject(
        projectId,
        "DELETE FROM collections WHERE project_id = $1 AND name = $2",
        [projectId, collectionName]
      );

      // SQLite auto-commits
      return result.rowCount > 0;
    } catch (error) {
      // SQLite handles rollback automatically
      throw error;
    } finally {
      // SQLite doesn't need connection release
    }
  }

  async getDocumentsByCollection(
    collectionId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ documents: Document[]; total: number }> {
    // Collections are in project DBs - we need to search all projects
    // This is inefficient, so throw an error suggesting to use getDocuments with projectId
    throw new Error("getDocumentsByCollection requires projectId. Use getDocuments(projectId, collectionName, options) instead.");
  }

  // Table Schema Methods (keeping for backward compatibility) - collections are in project DBs
  async createTableSchema(
    projectId: string,
    tableName: string,
    schema: {
      description?: string;
      fields: CollectionField[];
      indexes?: CollectionIndex[];
    },
    createdBy: string
  ): Promise<Collection> {
    // Collections are stored in project-specific databases
    const collectionId = uuidv4();
    await this.dbManager.queryProject(
      projectId,
      `INSERT INTO collections (id, project_id, name, description, fields, indexes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        collectionId,
        projectId,
        tableName,
        schema.description || null,
        JSON.stringify(schema.fields),
        JSON.stringify(schema.indexes || []),
        createdBy,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM collections WHERE id = $1",
      [collectionId]
    );

    return this.mapCollection(result.rows[0]);
  }

  async getTableSchema(
    projectId: string,
    tableName: string
  ): Promise<Collection | null> {
    // Collections are in project DBs
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, tableName]
    );

    return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
  }

  async getProjectTableSchemas(projectId: string): Promise<Collection[]> {
    // Collections are in project DBs
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM collections WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );

    return result.rows.map((row) => this.mapCollection(row));
  }

  async updateTableSchema(
    projectId: string,
    tableName: string,
    schema: {
      description?: string;
      fields?: CollectionField[];
      indexes?: CollectionIndex[];
    }
  ): Promise<Collection | null> {
    // Collections are in project DBs
    await this.dbManager.queryProject(
      projectId,
      `UPDATE collections 
       SET description = $1, fields = $2, indexes = $3 
       WHERE project_id = $4 AND name = $5`,
      [
        schema.description || null,
        JSON.stringify(schema.fields || []),
        JSON.stringify(schema.indexes || []),
        projectId,
        tableName,
      ]
    );

    // Query back the updated row
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, tableName]
    );

    return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
  }

  async deleteTableSchema(
    projectId: string,
    tableName: string
  ): Promise<boolean> {
    // Collections and documents are in project DBs
    try {
      // Get collection ID first
      const collectionResult = await this.dbManager.queryProject(
        projectId,
        "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
        [projectId, tableName]
      );

      if (collectionResult.rows.length === 0) {
        return false;
      }

      const collectionId = collectionResult.rows[0].id as string;

      // Delete all documents for this collection (from project DB)
      await this.dbManager.queryProject(
        projectId,
        "DELETE FROM documents WHERE collection_id = $1",
        [collectionId]
      );

      // Delete the collection (from project DB)
      const result = await this.dbManager.queryProject(
        projectId,
        "DELETE FROM collections WHERE project_id = $1 AND name = $2",
        [projectId, tableName]
      );

      // SQLite auto-commits
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      // SQLite handles rollback automatically
      throw error;
    }
  }

  // Document Methods
  async createDocument(
    projectId: string,
    collectionName: string,
    data: Record<string, unknown>,
    createdBy?: string
  ): Promise<Document> {
    await this.ensureReady();

    // First, get the collection_id using project_id and collection_name (from project DB)
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      throw new Error(
        `Collection '${collectionName}' not found in project '${projectId}'`
      );
    }

    const collectionId = collectionResult.rows[0]?.id as string;

    // Generate document ID (SQLite doesn't support RETURNING *)
    const documentId = uuidv4();

    // Now insert the document with the collection_id (in project DB)
    // JSON stringify data since SQLite stores it as TEXT
    await this.dbManager.queryProject(
      projectId,
      `INSERT INTO documents (id, collection_id, project_id, data, created_by, updated_by) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [documentId, collectionId, projectId, JSON.stringify(data), createdBy || "system", createdBy || "system"]
    );

    // Query back the inserted row (SQLite doesn't support RETURNING *)
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM documents WHERE id = $1`,
      [documentId]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error(
        `Failed to retrieve created document with id ${documentId}`
      );
    }

    return this.mapDocument(result.rows[0]);
  }

  async getDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<Document | null> {
    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return null;
    }

    const collectionId = collectionResult.rows[0].id as string;

    // Get document from project DB
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM documents WHERE id = $1 AND collection_id = $2",
      [documentId, collectionId]
    );

    return result.rows.length > 0 ? this.mapDocument(result.rows[0]) : null;
  }

  async getDocumentById(documentId: string): Promise<Document | null> {
    // Without projectId, we need to search all project databases
    // This is inefficient, so throw an error suggesting to use getDocument with projectId
    throw new Error("getDocumentById requires projectId. Use getDocument(projectId, collectionName, documentId) instead.");
  }

  async getDocuments(
    projectId: string,
    collectionName: string,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: "asc" | "desc";
      where?: Record<string, unknown>;
    } = {}
  ): Promise<{ documents: Document[]; total: number }> {
    const {
      limit = 100,
      offset = 0,
      orderBy = "created_at",
      order = "desc",
      where,
    } = options;

    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return { documents: [], total: 0 };
    }

    const collectionId = collectionResult.rows[0].id as string;

    // Build WHERE clause using collection_id instead of collection_name
    let whereClause = "WHERE collection_id = $1";
    const params: unknown[] = [collectionId];

    if (where && Object.keys(where).length > 0) {
      Object.entries(where).forEach(([key, value], _index) => {
        whereClause += ` AND JSON_EXTRACT(data, '$.${key}') = $${params.length + 1}`;
        params.push(value);
      });
    }

    // Get total count (from project DB)
    const countResult = await this.dbManager.queryProject(
      projectId,
      `SELECT COUNT(*) as count FROM documents ${whereClause}`,
      params
    );
    const total = parseInt(String(countResult.rows[0]?.count || 0));

    // Get documents
    let orderClause = `ORDER BY ${orderBy} ${order.toUpperCase()}`;

    // If ordering by a JSON field (not a database column), use JSON extraction
    if (
      orderBy !== "created_at" &&
      orderBy !== "updated_at" &&
      orderBy !== "id"
    ) {
      // For numeric fields like priority, cast to numeric for proper sorting
      if (
        orderBy === "priority" ||
        orderBy === "score" ||
        orderBy === "rating" ||
        orderBy === "count"
      ) {
        orderClause = `ORDER BY CAST(JSON_EXTRACT(data, '$.${orderBy}') AS NUMERIC) ${order.toUpperCase()}`;
      } else {
        orderClause = `ORDER BY JSON_EXTRACT(data, '$.${orderBy}') ${order.toUpperCase()}`;
      }
    }

    // Get documents from project DB
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM documents ${whereClause} 
       ${orderClause}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      documents: result.rows.map((row) => this.mapDocument(row)),
      total,
    };
  }

  async updateDocument(
    projectId: string,
    collectionName: string,
    documentId: string,
    data: Record<string, unknown>,
    updatedBy?: string
  ): Promise<Document | null> {
    // First, get the collection_id using project_id and collection_name (from project DB)
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      throw new Error(
        `Collection '${collectionName}' not found in project '${projectId}'`
      );
    }

    const collectionId = collectionResult.rows[0]?.id as string;

    // Update the document (SQLite doesn't support RETURNING *) - in project DB
    // JSON stringify data since SQLite stores it as TEXT
    await this.dbManager.queryProject(
      projectId,
      `UPDATE documents 
       SET data = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 
       WHERE id = $3 AND collection_id = $4`,
      [JSON.stringify(data), updatedBy || "system", documentId, collectionId]
    );

    // Query back the updated document
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM documents WHERE id = $1 AND collection_id = $2`,
      [documentId, collectionId]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return this.mapDocument(result.rows[0]);
  }

  async deleteDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<boolean> {
    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return false;
    }

    const collectionId = collectionResult.rows[0].id as string;

    // Delete from project DB
    const result = await this.dbManager.queryProject(
      projectId,
      "DELETE FROM documents WHERE id = $1 AND collection_id = $2",
      [documentId, collectionId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async searchDocuments(
    projectId: string,
    collectionName: string,
    searchTerm: string,
    searchFields?: string[],
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Document[]> {
    await this.ensureReady();

    const { limit = 50, offset = 0 } = options || {};

    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return [];
    }

    const collectionId = collectionResult.rows[0].id as string;

    let query = `SELECT * FROM documents WHERE collection_id = $1`;
    const params: unknown[] = [collectionId];

    if (searchTerm) {
      if (searchFields && searchFields.length > 0) {
        // Search in specific fields (SQLite uses LIKE instead of ILIKE)
        const fieldConditions = searchFields.map((field) => {
          params.push(`%${searchTerm}%`);
          return `JSON_EXTRACT(data, '$.${field}') LIKE $${params.length}`;
        });
        query += ` AND (${fieldConditions.join(" OR ")})`;
      } else {
        // Search in all data
        params.push(`%${searchTerm}%`);
        query += ` AND data LIKE $${params.length}`;
      }
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.dbManager.queryProject(projectId, query, params);
    return result.rows.map((row) => this.mapDocument(row));
  }

  async countDocuments(
    projectId: string,
    collectionName: string
  ): Promise<number> {
    await this.ensureReady();

    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return 0;
    }

    const collectionId = collectionResult.rows[0].id as string;

    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count FROM documents WHERE collection_id = $1",
      [collectionId]
    );

    return parseInt(String(result.rows[0]?.count || 0));
  }

  async getDocumentsByTable(
    tableId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ documents: Document[]; total: number }> {
    // First get the table schema to get project_id and table_name (from project DB)
    // We need to search across all project databases, which is inefficient
    // For now, throw an error suggesting to use getDocuments with projectId and collectionName
    throw new Error("getDocumentsByTable requires projectId. Use getDocuments(projectId, collectionName, options) instead.");
  }

  // File Methods (files are stored in project-specific databases)
  async createFile(
    data: Omit<FileRecord, "id" | "createdAt">
  ): Promise<FileRecord> {
    const fileId = uuidv4();
    const projectId = data.project_id;

    // Insert into project DB
    await this.dbManager.queryProject(
      projectId,
      `INSERT INTO files (id, project_id, filename, original_name, mime_type, size, path, url, uploaded_by, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        fileId,
        projectId,
        data.filename,
        data.original_name,
        data.mime_type,
        data.size,
        data.path,
        data.url || data.path, // Use path as URL if not provided
        data.uploaded_by,
        JSON.stringify(data.metadata || {}),
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM files WHERE id = $1",
      [fileId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Failed to retrieve created file with id ${fileId}`);
    }

    const file = this.mapFile(result.rows[0]);
    await this.updateProjectStats(projectId, data.size);
    return file;
  }

  async getFile(fileId: string): Promise<FileRecord | null> {
    // Without projectId, we need to search all project databases
    // This is inefficient, so we need to find the file across all projects
    const projectDbs = this.dbManager.listProjectDbs();
    
    for (const projectId of projectDbs) {
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1",
        [fileId]
      );
      
      if (result.rows.length > 0) {
        return this.mapFile(result.rows[0]);
      }
    }

    return null;
  }

  async getProjectFiles(projectId: string): Promise<FileRecord[]> {
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM files WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );

    return result.rows.map((row) => this.mapFile(row));
  }

  async deleteFile(fileId: string): Promise<FileRecord | null> {
    // First find which project the file belongs to
    const file = await this.getFile(fileId);
    if (!file) {
      return null;
    }

    const projectId = file.project_id;

    // Delete from project DB
    const result = await this.dbManager.queryProject(
      projectId,
      "DELETE FROM files WHERE id = $1",
      [fileId]
    );

    if (result.rowCount > 0) {
      await this.updateProjectStats(projectId, -file.size);
      return file;
    }

    return null;
  }

  // Session Methods (sessions are stored in main database)
  async createSession(
    data: Omit<BackendSession, "id" | "createdAt" | "lastActivity">
  ): Promise<BackendSession> {
    // Generate session ID (SQLite doesn't support RETURNING *)
    const sessionId = uuidv4();
    
    // Insert into main DB
    await this.dbManager.queryMain(
      `INSERT INTO sessions (id, token, user_id, project_id, type, scopes, metadata, created_at, expires_at, consumed, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        sessionId,
        data.token,
        data.user_id,
        data.project_id,
        data.type,
        JSON.stringify(data.scopes || []), // SQLite stores arrays as JSON strings
        JSON.stringify(data.metadata || {}), // SQLite stores objects as JSON strings
        data.created_at,
        data.expires_at,
        data.consumed ? 1 : 0, // SQLite uses INTEGER 1/0 for booleans
        1, // is_active (SQLite uses INTEGER 1 for true)
      ]
    );

    // Query back the inserted row (SQLite doesn't support RETURNING *)
    const result = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE id = $1",
      [sessionId]
    );

    return this.mapSession(result.rows[0]);
  }

  async getSessionByToken(token: string): Promise<BackendSession | null> {
    const result = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE token = $1 AND is_active = 1 AND expires_at > CURRENT_TIMESTAMP",
      [token]
    );

    if (result.rows.length > 0) {
      // Update last activity
      await this.dbManager.queryMain(
        "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1",
        [result.rows[0]?.id as string]
      );
      return this.mapSession(result.rows[0]);
    }

    return null;
  }

  async invalidateSession(token: string): Promise<boolean> {
    const result = await this.dbManager.queryMain(
      "UPDATE sessions SET is_active = 0 WHERE token = $1",
      [token]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async consumeSession(token: string): Promise<BackendSession | null> {
    // Update in main DB
    await this.dbManager.queryMain(
      `UPDATE sessions 
       SET consumed = 1, consumed_at = CURRENT_TIMESTAMP 
       WHERE token = $1 AND consumed = 0`,
      [token]
    );

    // Query back the updated row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE token = $1",
      [token]
    );

    return result.rows.length > 0 ? this.mapSession(result.rows[0]) : null;
  }

  async updateSession(
    token: string,
    updates: { consumed?: boolean; last_activity?: boolean }
  ): Promise<BackendSession | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.consumed !== undefined) {
      setClauses.push(`consumed = $${paramCount++}`);
      values.push(updates.consumed ? 1 : 0); // SQLite uses INTEGER 1/0 for booleans
      if (updates.consumed) {
        setClauses.push(`consumed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.last_activity) {
      setClauses.push(`last_activity = CURRENT_TIMESTAMP`);
    }

    if (setClauses.length === 0) {
      // No updates requested
      return this.getSessionByToken(token);
    }

    values.push(token);
    // SQLite doesn't support RETURNING *, so update and query back separately
    await this.dbManager.queryMain(
      `UPDATE sessions 
       SET ${setClauses.join(", ")} 
       WHERE token = $${paramCount}`,
      values
    );

    // Query back the updated row
    return this.getSessionByToken(token);
  }

  async getSessionById(sessionId: string): Promise<BackendSession | null> {
    const result = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE id = $1 AND is_active = 1 AND expires_at > CURRENT_TIMESTAMP",
      [sessionId]
    );

    return result.rows.length > 0 ? this.mapSession(result.rows[0]) : null;
  }

  async createDefaultAdmin(): Promise<void> {
    const defaultAdmin = {
      username: "admin",
      email: "admin@krapi.local",
      password_hash: await this.hashPassword("admin123"),
      role: "master_admin" as AdminRole,
      access_level: "full" as AccessLevel,
      permissions: [
        "users.create",
        "users.read",
        "users.update",
        "users.delete",
        "projects.create",
        "projects.read",
        "projects.update",
        "projects.delete",
        "collections.create",
        "collections.read",
        "collections.write",
        "collections.delete",
        "storage.upload",
        "storage.read",
        "storage.delete",
        "settings.read",
        "settings.update",
      ],
      active: true,
    };

    await this.createAdminUser({
      ...defaultAdmin,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    await this.dbManager.queryMain(
      "UPDATE sessions SET is_active = 0 WHERE user_id = $1",
      [userId]
    );
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.dbManager.queryMain(
      "DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP OR is_active = 0"
    );

    return result.rowCount ?? 0;
  }

  // Changelog Methods (changelog is stored in project-specific databases)
  async createChangelogEntry(
    data: CreateBackendChangelogEntry
  ): Promise<BackendChangelogEntry> {
    if (!data.project_id) {
      throw new Error("project_id is required for changelog entries");
    }

    // Generate changelog entry ID (SQLite doesn't support RETURNING *)
    const entryId = uuidv4();
    const createdAt = new Date().toISOString();
    
    // Insert into project DB
    await this.dbManager.queryProject(
      data.project_id,
      `INSERT INTO changelog (id, project_id, collection_id, action, entity_type, entity_id, changes, user_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entryId,
        data.project_id,
        (data as { collection_id?: string }).collection_id || null,
        data.action,
        data.entity_type,
        data.entity_id,
        JSON.stringify(data.changes || {}), // SQLite stores objects as JSON strings
        data.performed_by || null,
        createdAt,
      ]
    );

    // Query back the inserted row (SQLite doesn't support RETURNING *)
    const result = await this.dbManager.queryProject(
      data.project_id,
      "SELECT * FROM changelog WHERE id = $1",
      [entryId]
    );

    return this.mapChangelogEntry(result.rows[0]);
  }

  async getProjectChangelog(
    projectId: string,
    limit = 100
  ): Promise<BackendChangelogEntry[]> {
    // Changelog is in project DB, but we can't join with admin_users (which is in main DB)
    // So just get the changelog entries
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * 
       FROM changelog 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map((row) => this.mapChangelogEntry(row));
  }

  async getChangelogEntries(filters: {
    project_id?: string;
    entity_type?: string;
    entity_id?: string;
    limit?: number;
    offset?: number;
    collection_name?: string;
    user_id?: string;
    action_type?: string;
    start_date?: string;
    end_date?: string;
    document_id?: string;
  }): Promise<BackendChangelogEntry[]> {
    const {
      project_id,
      entity_type,
      entity_id,
      limit = 100,
      offset = 0,
      collection_name,
      user_id,
      action_type,
      start_date,
      end_date,
      document_id,
    } = filters;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (project_id) {
      conditions.push(`project_id = $${values.length + 1}`);
      values.push(project_id);
    }

    if (entity_type) {
      conditions.push(`entity_type = $${values.length + 1}`);
      values.push(entity_type);
    }

    if (entity_id) {
      conditions.push(`entity_id = $${values.length + 1}`);
      values.push(entity_id);
    }

    if (collection_name) {
      conditions.push(
        `entity_type = 'collection' AND entity_id = $${values.length + 1}`
      );
      values.push(collection_name);
    }

    if (user_id) {
      conditions.push(`performed_by = $${values.length + 1}`);
      values.push(user_id);
    }

    if (action_type) {
      conditions.push(`action = $${values.length + 1}`);
      values.push(action_type);
    }

    if (start_date) {
      conditions.push(`created_at >= $${values.length + 1}`);
      values.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $${values.length + 1}`);
      values.push(end_date);
    }

    if (document_id) {
      conditions.push(
        `entity_type = 'document' AND entity_id = $${values.length + 1}`
      );
      values.push(document_id);
    }

    values.push(limit);

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Changelog is in project DB, so we need project_id
    if (!project_id) {
      throw new Error("project_id is required for getChangelogEntries");
    }

    // Get changelog entries from project DB (can't join with admin_users in main DB)
    const result = await this.dbManager.queryProject(
      project_id,
      `SELECT * 
       FROM changelog 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${values.length} OFFSET $${values.length + 1}`,
      [...values, offset]
    );

    return result.rows.map((row) => this.mapChangelogEntry(row));
  }

  // API Key Methods (admin/system API keys are in main DB, project API keys are in project DBs)
  async createApiKey(data: {
    name: string;
    scopes: ApiKeyScope[];
    project_id?: string;
    user_id: string;
    expires_at?: string;
    rate_limit?: number;
    metadata?: Record<string, unknown>;
  }): Promise<BackendApiKey> {
    await this.ensureReady();
    const key = `krapi_${uuidv4().replace(/-/g, "")}`;
    const apiKeyId = uuidv4();

    // Admin/system API keys go to main DB
    await this.dbManager.queryMain(
      `INSERT INTO api_keys (id, key, name, type, owner_id, scopes, project_ids, expires_at, rate_limit, metadata, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        apiKeyId,
        key,
        data.name,
        data.project_id ? "project" : "admin",
        data.user_id,
        JSON.stringify(data.scopes),
        data.project_id ? JSON.stringify([data.project_id]) : JSON.stringify([]),
        data.expires_at || null,
        data.rate_limit || null,
        JSON.stringify(data.metadata || {}),
        1,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE id = $1",
      [apiKeyId]
    );

    return this.mapApiKey(result.rows[0]);
  }

  async getApiKey(key: string): Promise<BackendApiKey | null> {
    await this.ensureReady();
    
    // Try main DB first (admin/system keys)
    let result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE key = $1 AND is_active = 1",
      [key]
    );

    // If not found in main DB, search project DBs
    if (result.rows.length === 0) {
      const projectDbs = this.dbManager.listProjectDbs();
      for (const projectId of projectDbs) {
        result = await this.dbManager.queryProject(
          projectId,
          "SELECT * FROM api_keys WHERE key = $1 AND is_active = 1",
          [key]
        );
        if (result.rows.length > 0) break;
      }
    }

    if (result.rows.length === 0) return null;

    // Update last_used_at (determine which DB based on where we found it)
    const apiKey = result.rows[0];
    const projectId = apiKey.project_ids ? JSON.parse(apiKey.project_ids as string)[0] : null;
    
    if (projectId) {
      await this.dbManager.queryProject(
        projectId,
        "UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key = $1",
        [key]
      );
    } else {
      await this.dbManager.queryMain(
        "UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key = $1",
        [key]
      );
    }

    return this.mapApiKey(result.rows[0]);
  }

  async getApiKeysByOwner(ownerId: string): Promise<BackendApiKey[]> {
    await this.ensureReady();
    // Admin/system API keys are in main DB
    const result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE owner_id = $1 ORDER BY created_at DESC",
      [ownerId]
    );

    return result.rows.map((row) => this.mapApiKey(row));
  }

  async updateApiKey(
    id: string,
    data: Partial<BackendApiKey>
  ): Promise<BackendApiKey | null> {
    await this.ensureReady();
    
    // First find which DB has this API key
    let apiKey = await this.getApiKeyById(id);
    if (!apiKey) return null;

    const projectId = (apiKey as { project_ids?: string[] | string }).project_ids 
      ? (Array.isArray((apiKey as { project_ids?: string[] | string }).project_ids) 
          ? ((apiKey as { project_ids?: string[] | string }).project_ids as string[])[0] 
          : JSON.parse((apiKey as { project_ids?: string[] | string }).project_ids as string)[0]) 
      : apiKey.project_id || null;
    
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.scopes !== undefined) {
      fields.push(`scopes = $${paramCount++}`);
      values.push(JSON.stringify(data.scopes));
    }
    if (data.expires_at !== undefined) {
      fields.push(`expires_at = $${paramCount++}`);
      values.push(data.expires_at);
    }
    if (data.status !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.status === "active" ? 1 : 0);
    }

    if (fields.length === 0) return apiKey;

    values.push(id);

    // Update in appropriate DB
    if (projectId) {
      await this.dbManager.queryProject(
        projectId,
        `UPDATE api_keys SET ${fields.join(", ")} WHERE id = $${paramCount}`,
        values
      );
      
      // Query back from project DB
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM api_keys WHERE id = $1",
        [id]
      );
      return result.rows.length > 0 ? this.mapApiKey(result.rows[0]) : null;
    } else {
      await this.dbManager.queryMain(
        `UPDATE api_keys SET ${fields.join(", ")} WHERE id = $${paramCount}`,
        values
      );
      
      // Query back from main DB
      const result = await this.dbManager.queryMain(
        "SELECT * FROM api_keys WHERE id = $1",
        [id]
      );
      return result.rows.length > 0 ? this.mapApiKey(result.rows[0]) : null;
    }
  }

  async deleteApiKey(id: string): Promise<boolean> {
    await this.ensureReady();
    
    // First find which DB has this API key
    let apiKey = await this.getApiKeyById(id);
    if (!apiKey) return false;

    const projectId = (apiKey as { project_ids?: string[] | string }).project_ids 
      ? (Array.isArray((apiKey as { project_ids?: string[] | string }).project_ids) 
          ? ((apiKey as { project_ids?: string[] | string }).project_ids as string[])[0] 
          : JSON.parse((apiKey as { project_ids?: string[] | string }).project_ids as string)[0]) 
      : apiKey.project_id || null;
    
    if (projectId) {
      const result = await this.dbManager.queryProject(
        projectId,
        "UPDATE api_keys SET is_active = 0 WHERE id = $1",
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } else {
      const result = await this.dbManager.queryMain(
        "UPDATE api_keys SET is_active = 0 WHERE id = $1",
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    }
  }

  async getApiKeyById(id: string): Promise<BackendApiKey | null> {
    await this.ensureReady();
    
    // Try main DB first
    let result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE id = $1",
      [id]
    );

    // If not found, search project DBs
    if (result.rows.length === 0) {
      const projectDbs = this.dbManager.listProjectDbs();
      for (const projectId of projectDbs) {
        result = await this.dbManager.queryProject(
          projectId,
          "SELECT * FROM api_keys WHERE id = $1",
          [id]
        );
        if (result.rows.length > 0) break;
      }
    }

    return result.rows.length > 0 ? this.mapApiKey(result.rows[0]) : null;
  }

  // Create project API key (project-specific keys go to project DB)
  async createProjectApiKey(apiKey: {
    project_id: string;
    name: string;
    scopes: ApiKeyScope[];
    user_id: string;
    expires_at?: string;
    rate_limit?: number;
    metadata?: Record<string, unknown>;
  }): Promise<BackendApiKey> {
    await this.ensureReady();

    const key = `krapi_${uuidv4().replace(/-/g, "")}`;
    const apiKeyId = uuidv4();

    // Project API keys go to project-specific database
    await this.dbManager.queryProject(
      apiKey.project_id,
      `INSERT INTO api_keys (id, key, name, type, owner_id, scopes, expires_at, metadata, is_active, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        apiKeyId,
        key,
        apiKey.name,
        "project",
        apiKey.user_id,
        JSON.stringify(apiKey.scopes),
        apiKey.expires_at || null,
        JSON.stringify(apiKey.metadata || {}),
        1,
        new Date().toISOString(),
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryProject(
      apiKey.project_id,
      "SELECT * FROM api_keys WHERE id = $1",
      [apiKeyId]
    );

    return this.mapApiKey(result.rows[0]);
  }

  // Get project API keys (from project DB)
  async getProjectApiKeys(projectId: string): Promise<BackendApiKey[]> {
    await this.ensureReady();

    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM api_keys 
       WHERE type = 'project' AND is_active = 1
       ORDER BY created_at DESC`
    );

    return result.rows.map((row) => this.mapApiKey(row));
  }

  // Get project API key by ID (search project DB)
  async getProjectApiKeyById(keyId: string): Promise<BackendApiKey | null> {
    await this.ensureReady();

    // Search all project databases for this key
    const projectDbs = this.dbManager.listProjectDbs();
    for (const projectId of projectDbs) {
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM api_keys WHERE id = $1 AND type = 'project'",
        [keyId]
      );

      if (result.rows.length > 0) {
        return this.mapApiKey(result.rows[0]);
      }
    }

    return null;
  }

  // Delete project API key
  async deleteProjectApiKey(keyId: string): Promise<boolean> {
    await this.ensureReady();

    // Find which project DB has this key
    const apiKey = await this.getProjectApiKeyById(keyId);
    if (!apiKey) return false;

    // Find project_id from api_key (might need to search all projects)
    const projectDbs = this.dbManager.listProjectDbs();
    for (const projectId of projectDbs) {
      const result = await this.dbManager.queryProject(
        projectId,
        "UPDATE api_keys SET is_active = 0 WHERE id = $1 AND type = 'project'",
        [keyId]
      );
      if (result.rowCount > 0) return true;
    }

    return false;
  }

  // Get user API keys (admin/system keys from main DB)
  async getUserApiKeys(userId: string): Promise<BackendApiKey[]> {
    await this.ensureReady();

    const result = await this.dbManager.queryMain(
      `SELECT * FROM api_keys 
       WHERE owner_id = $1 AND type = 'admin' AND is_active = 1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => this.mapApiKey(row));
  }

  // Create user API key (admin/system keys go to main DB)
  async createUserApiKey(apiKey: {
    user_id: string;
    name: string;
    key: string;
    type: string;
    scopes: Scope[];
    project_ids: string[] | null;
    created_by: string;
    created_at: string;
    last_used_at: string | null;
    active: boolean;
  }): Promise<BackendApiKey> {
    await this.ensureReady();

    const apiKeyId = uuidv4();

    // Admin/system API keys go to main DB
    await this.dbManager.queryMain(
      `INSERT INTO api_keys (id, key, name, type, owner_id, scopes, project_ids, created_at, last_used_at, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        apiKeyId,
        apiKey.key,
        apiKey.name,
        apiKey.type,
        apiKey.user_id,
        JSON.stringify(apiKey.scopes),
        apiKey.project_ids ? JSON.stringify(apiKey.project_ids) : JSON.stringify([]),
        apiKey.created_at,
        apiKey.last_used_at || null,
        apiKey.active ? 1 : 0,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE id = $1",
      [apiKeyId]
    );

    return this.mapApiKey(result.rows[0]);
  }

  // Email Configuration Methods (project settings are in main DB)
  async getEmailConfig(
    projectId: string
  ): Promise<Record<string, unknown> | null> {
    await this.ensureReady();
    // Project metadata is in main DB
    const result = await this.dbManager.queryMain(
      "SELECT settings FROM projects WHERE id = $1",
      [projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const settings = typeof result.rows[0].settings === "string" 
      ? JSON.parse(result.rows[0].settings as string)
      : result.rows[0].settings;

    return (settings as Record<string, unknown>)?.email_config as Record<string, unknown> | null;
  }

  async updateEmailConfig(
    projectId: string,
    config: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    await this.ensureReady();
    // Get existing settings first
    const existingResult = await this.dbManager.queryMain(
      "SELECT settings FROM projects WHERE id = $1",
      [projectId]
    );

    if (existingResult.rows.length === 0) {
      return null;
    }

    const existingSettings = typeof existingResult.rows[0].settings === "string"
      ? JSON.parse(existingResult.rows[0].settings as string)
      : existingResult.rows[0].settings || {};

    // Update email config in settings
    const updatedSettings = {
      ...(existingSettings as Record<string, unknown>),
      email_config: config,
    };

    // Update in main DB
    await this.dbManager.queryMain(
      "UPDATE projects SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [JSON.stringify(updatedSettings), projectId]
    );

    return config;
  }

  async testEmailConfig(
    projectId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.ensureReady();

      // Get the project to check if email is configured
      const project = await this.getProjectById(projectId);
      if (!project) {
        return {
          success: false,
          message: "Project not found",
        };
      }

      // Check if email configuration exists
      const emailConfig = project.settings?.email_config;
      if (!emailConfig) {
        return {
          success: false,
          message: "Email configuration not found for this project",
        };
      }

      // Test the email configuration by creating a test transporter
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        secure: emailConfig.smtp_secure,
        auth: {
          user: emailConfig.smtp_username,
          pass: emailConfig.smtp_password,
        },
      });

      // Verify the connection
      await transporter.verify();

      // Send a test email
      const testResult = await transporter.sendMail({
        from: `"${emailConfig.from_name}" <${emailConfig.from_email}>`,
        to: email,
        subject: "KRAPI Email Configuration Test",
        html: `
          <h2>Email Configuration Test</h2>
          <p>This is a test email to verify your KRAPI email configuration.</p>
          <p>If you received this email, your configuration is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `,
        text: "This is a test email to verify your KRAPI email configuration.",
      });

      return {
        success: true,
        message: `Test email sent successfully to ${email}. Message ID: ${testResult.messageId}`,
      };
    } catch (error) {
      console.error("Test email config error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to test email configuration",
      };
    }
  }

  // Email Template Methods (email_templates are in main DB)
  async getEmailTemplates(
    projectId: string
  ): Promise<Record<string, unknown>[]> {
    await this.ensureReady();
    // Email templates are in main DB
    const result = await this.dbManager.queryMain(
      `SELECT * FROM email_templates 
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );
    return result.rows;
  }

  async getEmailTemplate(
    projectId: string,
    templateId: string
  ): Promise<Record<string, unknown> | null> {
    await this.ensureReady();
    // Email templates are in main DB
    const result = await this.dbManager.queryMain(
      `SELECT * FROM email_templates 
       WHERE project_id = $1 AND id = $2`,
      [projectId, templateId]
    );
    return result.rows[0] || null;
  }

  async createEmailTemplate(
    projectId: string,
    templateData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.ensureReady();
    const { name, subject, body, variables } = templateData as {
      name: string;
      subject: string;
      body: string;
      variables?: string[];
    };
    const templateId = uuidv4();
    const createdAt = new Date().toISOString();
    
    // Email templates are in main DB
    await this.dbManager.queryMain(
      `INSERT INTO email_templates (id, project_id, name, subject, body, variables, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        templateId,
        projectId,
        name,
        subject,
        body,
        JSON.stringify(variables || []),
        createdAt,
        createdAt,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM email_templates WHERE id = $1",
      [templateId]
    );
    return result.rows[0];
  }

  async updateEmailTemplate(
    projectId: string,
    templateId: string,
    templateData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.ensureReady();
    const { name, subject, body, variables } = templateData as {
      name: string;
      subject: string;
      body: string;
      variables?: string[];
    };
    
    // Email templates are in main DB
    await this.dbManager.queryMain(
      `UPDATE email_templates 
       SET name = $1, subject = $2, body = $3, variables = $4, updated_at = CURRENT_TIMESTAMP
       WHERE project_id = $5 AND id = $6`,
      [
        name,
        subject,
        body,
        JSON.stringify(variables || []),
        projectId,
        templateId,
      ]
    );

    // Query back the updated row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM email_templates WHERE project_id = $1 AND id = $2",
      [projectId, templateId]
    );
    return result.rows[0] || {};
  }

  async deleteEmailTemplate(
    projectId: string,
    templateId: string
  ): Promise<boolean> {
    await this.ensureReady();
    // Email templates are in main DB
    const result = await this.dbManager.queryMain(
      `DELETE FROM email_templates 
       WHERE project_id = $1 AND id = $2`,
      [projectId, templateId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async sendEmail(
    projectId: string,
    emailData: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.ensureReady();

      // Get the project to check if email is configured
      const project = await this.getProjectById(projectId);
      if (!project) {
        return {
          success: false,
          message: "Project not found",
        };
      }

      // Check if email configuration exists
      const emailConfig = project.settings?.email_config;
      if (!emailConfig) {
        return {
          success: false,
          message: "Email configuration not found for this project",
        };
      }

      // Validate required email data
      const { to, subject, body } = emailData;
      if (!to || !subject || !body) {
        return {
          success: false,
          message: "To, subject, and body are required for sending emails",
        };
      }

      // Create transporter and send email
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        secure: emailConfig.smtp_secure,
        auth: {
          user: emailConfig.smtp_username,
          pass: emailConfig.smtp_password,
        },
      });

      const result = await transporter.sendMail({
        from: `"${emailConfig.from_name}" <${emailConfig.from_email}>`,
        to: Array.isArray(to) ? (to as string[]).join(", ") : (to as string),
        subject: subject as string,
        html: body as string,
        text: (emailData.text as string) || (body as string),
        cc: emailData.cc as string | string[] | undefined,
        bcc: emailData.bcc as string | string[] | undefined,
        replyTo: emailData.replyTo as string | undefined,
        attachments: emailData.attachments as
          | Array<{
              filename?: string;
              content?: string | Buffer;
              path?: string;
              contentType?: string;
            }>
          | undefined,
      });

      return {
        success: true,
        message: `Email sent successfully. Message ID: ${
          (result as { messageId?: string }).messageId || "unknown"
        }`,
      };
    } catch (error) {
      console.error("Send email error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }

  // Additional API Key Methods (project API keys are in project DBs)
  async getProjectApiKey(
    projectId: string,
    keyId: string
  ): Promise<BackendApiKey | null> {
    await this.ensureReady();
    // Project API keys are in project DBs
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM api_keys 
       WHERE id = $1`,
      [keyId]
    );
    return result.rows.length > 0 ? this.mapApiKey(result.rows[0]) : null;
  }

  async updateProjectApiKey(
    projectId: string,
    keyId: string,
    updates: Partial<BackendApiKey>
  ): Promise<BackendApiKey | null> {
    await this.ensureReady();
    const { name, scopes, expires_at, status } = updates;
    
    // Project API keys are in project DBs
    await this.dbManager.queryProject(
      projectId,
      `UPDATE api_keys 
       SET name = $1, scopes = $2, expires_at = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        name || undefined,
        scopes ? JSON.stringify(scopes) : undefined,
        expires_at || null,
        status === "active" ? 1 : 0,
        keyId,
      ].filter((v) => v !== undefined)
    );

    // Query back the updated row
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM api_keys WHERE id = $1",
      [keyId]
    );
    return result.rows.length > 0 ? this.mapApiKey(result.rows[0]) : null;
  }

  async regenerateApiKey(
    projectId: string,
    keyId: string
  ): Promise<BackendApiKey | null> {
    await this.ensureReady();
    const newKey = `krapi_${uuidv4().replace(/-/g, "")}`;
    
    // Project API keys are in project DBs
    await this.dbManager.queryProject(
      projectId,
      `UPDATE api_keys 
       SET key = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newKey, keyId]
    );

    // Query back the updated row
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM api_keys WHERE id = $1",
      [keyId]
    );
    return result.rows.length > 0 ? this.mapApiKey(result.rows[0]) : null;
  }

  // Get active sessions (sessions are in main DB)
  async getActiveSessions(): Promise<BackendSession[]> {
    await this.ensureReady();

    // Sessions are in main DB
    const result = await this.dbManager.queryMain(
      `SELECT * FROM sessions 
       WHERE expires_at > CURRENT_TIMESTAMP AND is_active = 1
       ORDER BY created_at DESC`
    );
    return result.rows.map((row) => this.mapSession(row));
  }

  // Get activity logs (changelog is in project DBs - requires project_id)
  async getActivityLogs(options: {
    limit: number;
    offset: number;
    project_id?: string;
    filters?: {
      entity_type?: string;
      action?: string;
      performed_by?: string;
    };
  }): Promise<BackendChangelogEntry[]> {
    await this.ensureReady();

    if (!options.project_id) {
      throw new Error("project_id is required for getActivityLogs");
    }

    let query = `SELECT * FROM changelog WHERE project_id = $1`;
    const values: unknown[] = [options.project_id];
    let paramCount = 1;

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
      query += ` AND user_id = $${paramCount}`;
      values.push(options.filters.performed_by);
    }

    query += ` ORDER BY created_at DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(options.limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(options.offset);

    // Changelog is in project DB
    const result = await this.dbManager.queryProject(
      options.project_id,
      query,
      values
    );
    return result.rows.map((row) => this.mapChangelogEntry(row));
  }

  // Mapping functions
  private mapAdminUser(row: Record<string, unknown>): AdminUser {
    return {
      id: row.id as string,
      username: row.username as string,
      email: row.email as string,
      password_hash: row.password_hash as string,
      role: row.role as AdminRole,
      access_level: row.access_level as AccessLevel,
      permissions: (row.permissions as string[]) || [],
      active: row.is_active as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      last_login: row.last_login as string | undefined,
      api_key: row.api_key as string | undefined,
      login_count: (row.login_count as number) || 0,
    };
  }

  private mapProject(row: Record<string, unknown>): BackendProject {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      project_url: row.project_url as string | null,
      api_key: row.api_key as string,
      settings: row.settings as BackendProjectSettings,
      created_by: row.created_by as string,
      owner_id: row.owner_id as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      active: row.is_active as boolean,
      storage_used: (row.storage_used as number) || 0,
      allowed_origins: (row.allowed_origins as string[]) || [],
      total_api_calls: (row.total_api_calls as number) || 0,
      last_api_call: row.last_api_call as string | undefined,
      // Additional properties that the backend expects
      is_active: row.is_active as boolean,
      rate_limit: row.rate_limit as number | undefined,
      rate_limit_window: row.rate_limit_window as number | undefined,
    };
  }

  private mapProjectUser(row: Record<string, unknown>): BackendProjectUser {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      username: row.username as string,
      email: row.email as string,
      phone: row.phone as string | undefined,
      is_verified: row.is_verified as boolean,
      scopes: (row.scopes as string[]) || [],
      password: row.password as string | undefined,
      permissions: (row.permissions as string[]) || [],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      last_login: row.last_login as string | undefined,
      status: (row.status as "active" | "inactive" | "suspended") || "active",
      // Additional properties that the backend expects
      is_active: row.is_active as boolean,
      metadata: (row.metadata as Record<string, unknown>) || {},
      // Additional properties for SDK compatibility
      role: row.role as UserRole | undefined,
      login_count: row.login_count as number | undefined,
    };
  }

  private mapCollection(row: Record<string, unknown>): Collection {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      fields: (row.fields as CollectionField[]) || [],
      indexes: (row.indexes as CollectionIndex[]) || [],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      schema: {
        fields: (row.fields as CollectionField[]) || [],
        indexes: (row.indexes as CollectionIndex[]) || [],
      },
      settings: {
        read_permissions: [],
        write_permissions: [],
        delete_permissions: [],
        enable_audit_log: false,
        enable_versioning: false,
        enable_soft_delete: false,
      },
    };
  }

  private mapDocument(row: Record<string, unknown>): Document {
    // Parse data from JSON string (SQLite stores JSON as TEXT)
    let parsedData: Record<string, unknown> = {};
    if (typeof row.data === "string") {
      try {
        parsedData = JSON.parse(row.data);
      } catch (error) {
        console.error("Error parsing document data JSON:", error);
        parsedData = {};
      }
    } else if (typeof row.data === "object" && row.data !== null) {
      parsedData = row.data as Record<string, unknown>;
    }

    return {
      id: row.id as string,
      project_id: row.project_id as string,
      collection_id: row.collection_id as string,
      data: parsedData,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      created_by: row.created_by as string | undefined,
      updated_by: row.updated_by as string | undefined,
      version: (row.version as number) || 1,
      is_deleted: (row.is_deleted as boolean) || false,
    };
  }

  private mapFile(row: Record<string, unknown>): FileRecord {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      filename: row.filename as string,
      original_name: row.original_name as string,
      mime_type: row.mime_type as string,
      size: parseInt(row.size as string),
      path: row.path as string,
      uploaded_by: row.created_by as string,
      created_at: row.created_at as string,
      url: (row.url as string) || "",
      updated_at: (row.updated_at as string) || (row.created_at as string),
    };
  }

  private mapSession(row: Record<string, unknown>): BackendSession {
    return {
      id: row.id as string,
      token: row.token as string,
      type: row.type as SessionType,
      user_id: row.user_id as string,
      project_id: row.project_id as string | undefined,
      scopes: (row.scopes as Scope[]) || [],
      metadata: (row.metadata as Record<string, unknown>) || {},
      expires_at: row.expires_at as string,
      created_at: row.created_at as string,
      last_used_at: row.last_used_at as string | undefined,
      ip_address: row.ip_address as string | undefined,
      user_agent: row.user_agent as string | undefined,
      is_active: row.is_active as boolean,
      consumed: !(row.is_active as boolean),
    };
  }

  private mapChangelogEntry(
    row: Record<string, unknown>
  ): BackendChangelogEntry {
    return {
      id: row.id as string,
      project_id: row.project_id as string | undefined,
      entity_type: row.entity_type as string,
      entity_id: row.entity_id as string,
      action: row.action as string,
      changes: (row.changes as Record<string, unknown>) || {},
      performed_by: row.performed_by as string,
      session_id: row.session_id as string | undefined,
      created_at: row.created_at as string,
      user_id: row.performed_by as string,
      resource_type: row.entity_type as string,
      resource_id: row.entity_id as string,
    };
  }

  private mapApiKey(row: Record<string, unknown>): BackendApiKey {
    return {
      id: row.id as string,
      key: row.key as string,
      name: row.name as string,
      scopes: (row.scopes as ApiKeyScope[]) || [],
      project_id: row.project_id as string | undefined, // Use project_id from database
      user_id: row.user_id as string,
      status: row.is_active ? "active" : "inactive", // Map from is_active boolean
      expires_at: row.expires_at as string | undefined,
      last_used_at: row.last_used_at as string | undefined,
      created_at: row.created_at as string,
      usage_count: (row.usage_count as number) || 0,
      rate_limit: row.rate_limit as number | undefined,
      metadata: (row.metadata as Record<string, unknown>) || {},
    };
  }

  // Close connection pool
  async close(): Promise<void> {
    await this.adapter.end();
  }

  // Enhanced query method with retry logic
  private async queryWithRetry<T = Record<string, unknown>>(
    queryText: string,
    values?: unknown[],
    retries = 3
  ): Promise<T[]> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        await this.ensureReady();
        const result = await this.adapter.query(queryText, values);
        return result.rows as T[];
      } catch (error) {
        lastError = error as Error;
        console.error(`Query attempt ${i + 1} failed:`, error);

        // Check if it's a connection error
        if (
          error instanceof Error &&
          (error.message.includes("connection") ||
            error.message.includes("ECONNREFUSED"))
        ) {
          this.isConnected = false;
          await this.initializeWithRetry();
        }

        // Wait before retry with exponential backoff
        if (i < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, i) * 1000)
          );
        }
      }
    }

    throw lastError || new Error("Query failed after retries");
  }

  async getProjectStats(projectId: string): Promise<{
    totalDocuments: number;
    totalCollections: number;
    totalFiles: number;
    totalUsers: number;
    storageUsed: number;
    apiCallsCount: number;
    lastApiCall: Date | null;
  }> {
    await this.ensureReady();

    // Get document count (from project DB)
    const docResult = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count FROM documents",
      []
    );
    const totalDocuments = parseInt(String(docResult.rows[0]?.count || 0));

    // Get collection count (from project DB)
    const colResult = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count FROM collections",
      []
    );
    const totalCollections = parseInt(String(colResult.rows[0]?.count || 0));

    // Get file count (from project DB)
    const fileResult = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count FROM files",
      []
    );
    const totalFiles = parseInt(String(fileResult.rows[0]?.count || 0));

    // Get user count (from project DB)
    const userResult = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count FROM project_users",
      []
    );
    const totalUsers = parseInt(String(userResult.rows[0]?.count || 0));

    // Get project info (from main DB)
    const projectResult = await this.dbManager.queryMain(
      "SELECT storage_used, api_calls_count, last_api_call FROM projects WHERE id = $1",
      [projectId]
    );
    const project = projectResult.rows[0] as { storage_used?: number; api_calls_count?: number; last_api_call?: string } | undefined;

    return {
      totalDocuments,
      totalCollections,
      totalFiles,
      totalUsers,
      storageUsed: project?.storage_used || 0,
      apiCallsCount: project?.api_calls_count || 0,
      lastApiCall: project?.last_api_call
        ? new Date(project.last_api_call)
        : null,
    };
  }

  async getProjectActivity(
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
      entityType?: string;
      action?: string;
    } = {}
  ): Promise<{ activities: BackendChangelogEntry[]; total: number }> {
    await this.ensureReady();
    const { limit = 50, offset = 0, entityType, action } = options;

    let whereClause = "WHERE project_id = $1";
    const params: unknown[] = [projectId];
    let paramCount = 1;

    if (entityType) {
      whereClause += ` AND entity_type = $${++paramCount}`;
      params.push(entityType);
    }

    if (action) {
      whereClause += ` AND action = $${++paramCount}`;
      params.push(action);
    }

    // Get total count (from project DB)
    const countResult = await this.dbManager.queryProject(
      projectId,
      `SELECT COUNT(*) as count FROM changelog ${whereClause}`,
      params
    );
    const total = parseInt(String(countResult.rows[0]?.count || 0));

    // Get activities (from project DB)
    const activitiesResult = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM changelog ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    const activities = activitiesResult.rows.map((row) =>
      this.mapChangelogEntry(row)
    );

    return { activities, total };
  }

  async getProjectSettings(projectId: string): Promise<{
    emailConfig: Record<string, unknown>;
    storageConfig: Record<string, unknown>;
    apiConfig: Record<string, unknown>;
    generalConfig: Record<string, unknown>;
  }> {
    await this.ensureReady();

    // Get project
    const project = await this.getProjectById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Return default settings for now
    // Future enhancement: Implement persistent settings storage in database
    return {
      emailConfig: {
        enabled: false,
        provider: "smtp",
        settings: {},
      },
      storageConfig: {
        maxStorage: 1073741824, // 1GB default
        allowedFileTypes: ["*"],
        compression: true,
      },
      apiConfig: {
        rateLimit: 1000,
        maxRequestSize: 10485760, // 10MB
        cors: {
          enabled: true,
          origins: ["*"],
        },
      },
      generalConfig: {
        maintenanceMode: false,
        debugMode: false,
        logLevel: "info",
      },
    };
  }

  async getProjectStorageStats(projectId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    lastUpload: Date | null;
  }> {
    await this.ensureReady();

    // Get total files and size (from project DB)
    const filesResult = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files",
      []
    );

    const fileRow = filesResult.rows[0] as { count: unknown; total_size: unknown } | undefined;
    const totalFiles = parseInt(String(fileRow?.count || 0));
    const totalSize = parseInt(String(fileRow?.total_size || 0));

    // Get file type distribution (from project DB)
    const typesResult = await this.dbManager.queryProject(
      projectId,
      "SELECT mime_type, COUNT(*) as count FROM files GROUP BY mime_type",
      []
    );

    const fileTypes: Record<string, number> = {};
    typesResult.rows.forEach((row) => {
      const typedRow = row as { mime_type: string; count: unknown };
      fileTypes[typedRow.mime_type] = parseInt(String(typedRow.count || 0));
    });

    // Get last upload (from project DB)
    const lastUploadResult = await this.dbManager.queryProject(
      projectId,
      "SELECT created_at FROM files ORDER BY created_at DESC LIMIT 1",
      []
    );

    const lastUpload =
      lastUploadResult.rows.length > 0
        ? new Date(lastUploadResult.rows[0]?.created_at as string)
        : null;

    return {
      totalFiles,
      totalSize,
      fileTypes,
      lastUpload,
    };
  }

  /**
   * Get storage statistics for a project
   */
  async getStorageStatistics(projectId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    lastUpload: Date | null;
    storageUsed: number;
    storageLimit: number;
  }> {
    try {
      // Get total files and size (from project DB)
      const filesResult = await this.dbManager.queryProject(
        projectId,
        "SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files",
        []
      );

      const fileRow = filesResult.rows[0] as { count: unknown; total_size: unknown } | undefined;
      const totalFiles = parseInt(String(fileRow?.count || 0));
      const totalSize = parseInt(String(fileRow?.total_size || 0));

      // Get file type distribution (from project DB)
      const fileTypesResult = await this.dbManager.queryProject(
        projectId,
        "SELECT mime_type, COUNT(*) as count FROM files GROUP BY mime_type",
        []
      );

      const fileTypes: Record<string, number> = {};
      fileTypesResult.rows.forEach((row) => {
        const typedRow = row as { mime_type: string; count: unknown };
        fileTypes[typedRow.mime_type] = parseInt(String(typedRow.count || 0));
      });

      // Get last upload time (from project DB)
      const lastUploadResult = await this.dbManager.queryProject(
        projectId,
        "SELECT created_at FROM files ORDER BY created_at DESC LIMIT 1",
        []
      );

      const lastUpload =
        lastUploadResult.rows.length > 0
          ? new Date(lastUploadResult.rows[0]?.created_at as string)
          : null;

      // Get project storage info (from main DB)
      const projectResult = await this.dbManager.queryMain(
        "SELECT storage_used FROM projects WHERE id = $1",
        [projectId]
      );

      const project = projectResult.rows[0] as { storage_used?: number } | undefined;
      const storageUsed = project?.storage_used || 0;
      // storage_limit doesn't exist in projects table - use default from settings
      const storageLimit = 1073741824; // 1GB default

      return {
        totalFiles,
        totalSize,
        fileTypes,
        lastUpload,
        storageUsed,
        storageLimit,
      };
    } catch (error) {
      console.error("Error getting storage statistics:", error);
      throw error;
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(data: {
    project_id: string;
    name: string;
    parent_folder_id?: string;
    metadata?: Record<string, unknown>;
    created_by: string;
    created_at: string;
  }): Promise<{
    id: string;
    project_id: string;
    name: string;
    parent_folder_id?: string;
    metadata?: Record<string, unknown>;
    created_by: string;
    created_at: string;
  }> {
    try {
      // Folders should be in project DBs
      // TODO: Add folders table to project DB initialization
      const folderId = uuidv4();
      
      // Insert folder into project DB
      await this.dbManager.queryProject(
        data.project_id,
        `INSERT INTO folders (id, project_id, name, parent_folder_id, metadata, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          folderId,
          data.project_id,
          data.name,
          data.parent_folder_id || null,
          data.metadata ? JSON.stringify(data.metadata) : null,
          data.created_by,
          data.created_at,
        ]
      ).catch(() => ({}));

      // Query back the inserted row
      const insertedResult = await this.dbManager.queryProject(
        data.project_id,
        `SELECT id, project_id, name, parent_folder_id, metadata, created_by, created_at
         FROM folders WHERE id = $1`,
        [folderId]
      ).catch(() => ({ rows: [] }));

      const row = insertedResult.rows[0] as {
        id: string;
        project_id: string;
        name: string;
        parent_folder_id?: string;
        metadata?: string;
        created_by: string;
        created_at: string;
      };

      return {
        id: row.id,
        project_id: row.project_id,
        name: row.name,
        parent_folder_id: row.parent_folder_id || undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        created_by: row.created_by,
        created_at: row.created_at,
      };
    } catch (error) {
      console.error("Error creating folder:", error);
      throw error;
    }
  }

  /**
   * Get folders for a project
   */
  async getFolders(
    projectId: string,
    options: {
      parent_folder_id?: string;
      include_files?: boolean;
    } = {}
  ): Promise<Record<string, unknown>[]> {
    try {
      let query = "SELECT * FROM folders WHERE project_id = $1";
      const params = [projectId];

      if (options.parent_folder_id) {
        query += " AND parent_folder_id = $2";
        params.push(options.parent_folder_id);
      } else {
        query += " AND parent_folder_id IS NULL";
      }

      query += " ORDER BY name";

      // Folders should be in project DBs
      // TODO: Add folders table to project DB initialization
      const result = await this.dbManager.queryProject(
        projectId,
        query,
        params
      ).catch(() => ({ rows: [] }));
      
      const folders = result.rows;

      if (options.include_files) {
        for (const folder of folders) {
          // Files are in project DBs - check metadata for folder_id
          const filesResult = await this.dbManager.queryProject(
            projectId,
            "SELECT COUNT(*) as count FROM files WHERE JSON_EXTRACT(metadata, '$.folder_id') = $1",
            [folder.id]
          ).catch(() => ({ rows: [{ count: 0 }] }));
          folder.file_count = parseInt(String(filesResult.rows[0]?.count || 0));
        }
      }

      return folders;
    } catch (error) {
      console.error("Error getting folders:", error);
      throw error;
    }
  }

  /**
   * Delete a folder
   */
  async deleteFolder(projectId: string, folderId: string): Promise<void> {
    try {
      // Folders should be in project DBs
      // TODO: Add folders table to project DB initialization
      // Check if folder has files (check file metadata for folder_id)
      const filesResult = await this.dbManager.queryProject(
        projectId,
        "SELECT COUNT(*) as count FROM files WHERE JSON_EXTRACT(metadata, '$.folder_id') = $1",
        [folderId]
      ).catch(() => ({ rows: [{ count: 0 }] }));

      if (parseInt(String(filesResult.rows[0]?.count || 0)) > 0) {
        throw new Error(
          "Cannot delete folder with files. Move or delete files first."
        );
      }

      // Check if folder has subfolders
      const subfoldersResult = await this.dbManager.queryProject(
        projectId,
        "SELECT COUNT(*) as count FROM folders WHERE parent_folder_id = $1",
        [folderId]
      ).catch(() => ({ rows: [{ count: 0 }] }));

      if (parseInt(String(subfoldersResult.rows[0]?.count || 0)) > 0) {
        throw new Error(
          "Cannot delete folder with subfolders. Delete subfolders first."
        );
      }

      // Delete folder from project DB
      await this.dbManager.queryProject(
        projectId,
        "DELETE FROM folders WHERE id = $1 AND project_id = $2",
        [folderId, projectId]
      ).catch(() => ({ rowCount: 0 }));
    } catch (error) {
      console.error("Error deleting folder:", error);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(
    projectId: string,
    fileId: string
  ): Promise<FileRecord | null> {
    try {
      // Files are stored in project-specific databases
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      return result.rows.length > 0 ? this.mapFile(result.rows[0]) : null;
    } catch (error) {
      console.error("Error getting file by ID:", error);
      throw error;
    }
  }

  /**
   * Generate file URL for download
   */
  async generateFileUrl(file: FileRecord, expiresIn: number): Promise<string> {
    try {
      // This is a simplified implementation
      // In production, you'd want to use a proper file storage service like S3
      const expiresAt = Date.now() + expiresIn * 1000;
      const signature = this.generateFileSignature(file.id, expiresAt);

      return `/api/storage/${file.project_id}/files/${file.id}/download?expires=${expiresAt}&signature=${signature}`;
    } catch (error) {
      console.error("Error generating file URL:", error);
      throw error;
    }
  }

  /**
   * Generate file signature for security
   */
  private generateFileSignature(fileId: string, expiresAt: number): string {
    const secret = process.env.FILE_SIGNATURE_SECRET || "default-secret";
    const data = `${fileId}:${expiresAt}`;
    return crypto.createHmac("sha256", secret).update(data).digest("hex");
  }

  /**
   * Bulk delete files
   */
  async bulkDeleteFiles(
    projectId: string,
    fileIds: string[]
  ): Promise<{
    deleted: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const result = {
        deleted: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const fileId of fileIds) {
        try {
          const file = await this.deleteFile(fileId);
          if (file) {
            result.deleted++;
          } else {
            result.failed++;
            result.errors.push(`File ${fileId} not found`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to delete file ${fileId}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      console.error("Error bulk deleting files:", error);
      throw error;
    }
  }

  /**
   * Bulk move files
   */
  async bulkMoveFiles(
    projectId: string,
    fileIds: string[],
    destinationFolderId?: string
  ): Promise<{
    moved: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const result = {
        moved: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const fileId of fileIds) {
        try {
          // Files are in project DBs
          await this.dbManager.queryProject(
            projectId,
            "UPDATE files SET metadata = JSON_SET(COALESCE(metadata, '{}'), '$.folder_id', $1) WHERE id = $2 AND project_id = $3",
            [destinationFolderId || null, fileId, projectId]
          );
          result.moved++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to move file ${fileId}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      console.error("Error bulk moving files:", error);
      throw error;
    }
  }

  /**
   * Bulk update file metadata
   */
  async bulkUpdateFileMetadata(
    projectId: string,
    fileIds: string[],
    metadata: Record<string, unknown>
  ): Promise<{
    updated: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const result = {
        updated: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const fileId of fileIds) {
        try {
          // Files are in project DBs - merge metadata using SQLite JSON functions
          const existingFile = await this.dbManager.queryProject(
            projectId,
            "SELECT metadata FROM files WHERE id = $1 AND project_id = $2",
            [fileId, projectId]
          );
          
          if (existingFile.rows.length > 0) {
            const existingMetadata = JSON.parse(existingFile.rows[0].metadata as string || "{}");
            const mergedMetadata = { ...existingMetadata, ...metadata };
            
            await this.dbManager.queryProject(
              projectId,
              "UPDATE files SET metadata = $1 WHERE id = $2 AND project_id = $3",
              [JSON.stringify(mergedMetadata), fileId, projectId]
            );
          }
          result.updated++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to update file ${fileId}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      console.error("Error bulk updating file metadata:", error);
      throw error;
    }
  }

  /**
   * Copy a file
   */
  async copyFile(
    projectId: string,
    fileId: string,
    options: {
      destination_folder_id?: string;
      new_name?: string;
    }
  ): Promise<FileRecord> {
    try {
      const originalFile = await this.getFileById(projectId, fileId);
      if (!originalFile) {
        throw new Error("File not found");
      }

      const newFilename = options.new_name || `copy_${originalFile.filename}`;
      const newPath = `copies/${Date.now()}_${newFilename}`;
      const newFileId = uuidv4();

      // Files are in project DBs
      await this.dbManager.queryProject(
        projectId,
        `INSERT INTO files (id, project_id, filename, original_name, mime_type, size, path, url, uploaded_by, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newFileId,
          projectId,
          newFilename,
          originalFile.original_name,
          originalFile.mime_type,
          originalFile.size,
          newPath,
          newPath, // Use path as URL if not provided
          originalFile.uploaded_by || "system",
          JSON.stringify(originalFile.metadata || {}),
        ]
      );

      // Query back the inserted row
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1",
        [newFileId]
      );

      return this.mapFile(result.rows[0]);
    } catch (error) {
      console.error("Error copying file:", error);
      throw error;
    }
  }

  /**
   * Move a file
   */
  async moveFile(
    projectId: string,
    fileId: string,
    options: {
      destination_folder_id?: string;
      new_name?: string;
    }
  ): Promise<FileRecord> {
    try {
      const file = await this.getFileById(projectId, fileId);
      if (!file) {
        throw new Error("File not found");
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (options.destination_folder_id !== undefined) {
        updates.push(`folder_id = $${paramCount++}`);
        values.push(options.destination_folder_id);
      }

      if (options.new_name) {
        updates.push(`filename = $${paramCount++}`);
        values.push(options.new_name);
      }

      if (updates.length === 0) {
        return file;
      }

      values.push(fileId, projectId);
      const result = await this.adapter.query(
        `UPDATE files SET ${updates.join(
          ", "
        )} WHERE id = $${paramCount} AND project_id = $${
          paramCount + 1
        } RETURNING *`,
        values
      );

      return this.mapFile(result.rows[0]);
    } catch (error) {
      console.error("Error moving file:", error);
      throw error;
    }
  }

  /**
   * Rename a file
   */
  async renameFile(
    projectId: string,
    fileId: string,
    newName: string
  ): Promise<FileRecord> {
    try {
      // Files are in project DBs
      await this.dbManager.queryProject(
        projectId,
        "UPDATE files SET filename = $1 WHERE id = $2 AND project_id = $3",
        [newName, fileId, projectId]
      );

      // Query back the updated row
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      if (result.rows.length === 0) {
        throw new Error("File not found");
      }

      return this.mapFile(result.rows[0]);
    } catch (error) {
      console.error("Error renaming file:", error);
      throw error;
    }
  }

  /**
   * Update file metadata (files are in project DBs)
   */
  async updateFileMetadata(
    projectId: string,
    fileId: string,
    metadata: Record<string, unknown>
  ): Promise<FileRecord> {
    try {
      // Get existing metadata first
      const existingFile = await this.dbManager.queryProject(
        projectId,
        "SELECT metadata FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      if (existingFile.rows.length === 0) {
        throw new Error("File not found");
      }

      // Merge metadata
      const existingMetadata = JSON.parse(existingFile.rows[0].metadata as string || "{}");
      const mergedMetadata = { ...existingMetadata, ...metadata };

      // Update in project DB
      await this.dbManager.queryProject(
        projectId,
        "UPDATE files SET metadata = $1 WHERE id = $2 AND project_id = $3",
        [JSON.stringify(mergedMetadata), fileId, projectId]
      );

      // Query back the updated row
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      return this.mapFile(result.rows[0]);
    } catch (error) {
      console.error("Error updating file metadata:", error);
      throw error;
    }
  }

  /**
   * Add tags to a file
   */
  async addFileTags(
    projectId: string,
    fileId: string,
    tags: string[]
  ): Promise<FileRecord> {
    try {
      const file = await this.getFileById(projectId, fileId);
      if (!file) {
        throw new Error("File not found");
      }

      const currentTags = (file.metadata?.tags as string[]) || [];
      const newTags = [...new Set([...currentTags, ...tags])];

      // Get existing metadata first
      const existingMetadata = JSON.parse((file.metadata ? JSON.stringify(file.metadata) : "{}") || "{}");
      const updatedMetadata = { ...existingMetadata, tags: newTags };

      // Files are in project DBs
      await this.dbManager.queryProject(
        projectId,
        "UPDATE files SET metadata = $1 WHERE id = $2 AND project_id = $3",
        [JSON.stringify(updatedMetadata), fileId, projectId]
      );

      // Query back the updated row
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      return this.mapFile(result.rows[0]);
    } catch (error) {
      console.error("Error adding file tags:", error);
      throw error;
    }
  }

  /**
   * Remove tags from a file
   */
  async removeFileTags(
    projectId: string,
    fileId: string,
    tags: string[]
  ): Promise<FileRecord> {
    try {
      const file = await this.getFileById(projectId, fileId);
      if (!file) {
        throw new Error("File not found");
      }

      const currentTags = (file.metadata?.tags as string[]) || [];
      const newTags = currentTags.filter((tag) => !tags.includes(tag));

      // Get existing metadata first
      const existingMetadata = JSON.parse((file.metadata ? JSON.stringify(file.metadata) : "{}") || "{}");
      const updatedMetadata = { ...existingMetadata, tags: newTags };

      // Files are in project DBs
      await this.dbManager.queryProject(
        projectId,
        "UPDATE files SET metadata = $1 WHERE id = $2 AND project_id = $3",
        [JSON.stringify(updatedMetadata), fileId, projectId]
      );

      // Query back the updated row
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      return this.mapFile(result.rows[0]);
    } catch (error) {
      console.error("Error removing file tags:", error);
      throw error;
    }
  }

  /**
   * Get file permissions
   */
  async getFilePermissions(
    projectId: string,
    fileId: string
  ): Promise<Record<string, unknown>[]> {
    try {
      // File permissions should be in project DBs
      // TODO: Add file_permissions table to project DB initialization
      // For now, return empty array if table doesn't exist
      const result = await this.dbManager.queryProject(
        projectId,
        `SELECT fp.*, u.user_id as username, u.email 
         FROM file_permissions fp 
         JOIN project_users u ON fp.user_id = u.id 
         WHERE fp.file_id = $1 AND fp.project_id = $2`,
        [fileId, projectId]
      ).catch(() => ({ rows: [] }));

      return result.rows;
    } catch (error) {
      console.error("Error getting file permissions:", error);
      throw error;
    }
  }

  /**
   * Grant file permission
   */
  async grantFilePermission(
    projectId: string,
    fileId: string,
    userId: string,
    permission: string
  ): Promise<Record<string, unknown>> {
    try {
      // File permissions should be in project DBs
      // TODO: Add file_permissions table to project DB initialization
      const permissionId = uuidv4();
      
      // Check if permission already exists
      const existing = await this.dbManager.queryProject(
        projectId,
        "SELECT id FROM file_permissions WHERE project_id = $1 AND file_id = $2 AND user_id = $3",
        [projectId, fileId, userId]
      ).catch(() => ({ rows: [] }));

      if (existing.rows.length > 0) {
        // Update existing permission
        await this.dbManager.queryProject(
          projectId,
          `UPDATE file_permissions 
           SET permission = $1, granted_by = $2, granted_at = CURRENT_TIMESTAMP
           WHERE project_id = $3 AND file_id = $4 AND user_id = $5`,
          [permission, "system", projectId, fileId, userId]
        ).catch(() => ({}));
      } else {
        // Insert new permission
        await this.dbManager.queryProject(
          projectId,
          `INSERT INTO file_permissions (id, project_id, file_id, user_id, permission, granted_by, granted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            permissionId,
            projectId,
            fileId,
            userId,
            permission,
            "system",
            new Date().toISOString(),
          ]
        ).catch(() => ({}));
      }

      // Query back the permission
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM file_permissions WHERE project_id = $1 AND file_id = $2 AND user_id = $3",
        [projectId, fileId, userId]
      ).catch(() => ({ rows: [] }));

      return result.rows[0] || {};
    } catch (error) {
      console.error("Error granting file permission:", error);
      throw error;
    }
  }

  /**
   * Revoke file permission
   */
  async revokeFilePermission(
    projectId: string,
    fileId: string,
    userId: string
  ): Promise<void> {
    try {
      // File permissions should be in project DBs
      await this.dbManager.queryProject(
        projectId,
        "DELETE FROM file_permissions WHERE project_id = $1 AND file_id = $2 AND user_id = $3",
        [projectId, fileId, userId]
      ).catch(() => ({ rowCount: 0 }));
    } catch (error) {
      console.error("Error revoking file permission:", error);
      throw error;
    }
  }

  /**
   * Get file versions
   */
  async getFileVersions(
    projectId: string,
    fileId: string
  ): Promise<Record<string, unknown>[]> {
    try {
      // File versions should be in project DBs
      // TODO: Add file_versions table to project DB initialization
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM file_versions WHERE project_id = $1 AND file_id = $2 ORDER BY version_number DESC",
        [projectId, fileId]
      ).catch(() => ({ rows: [] }));

      return result.rows;
    } catch (error) {
      console.error("Error getting file versions:", error);
      throw error;
    }
  }

  /**
   * Upload file version
   */
  async uploadFileVersion(
    projectId: string,
    fileId: string,
    file: Express.Multer.File,
    userId: string
  ): Promise<Record<string, unknown>> {
    try {
      // File versions should be in project DBs
      // TODO: Add file_versions table to project DB initialization
      const versionResult = await this.dbManager.queryProject(
        projectId,
        "SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM file_versions WHERE project_id = $1 AND file_id = $2",
        [projectId, fileId]
      ).catch(() => ({ rows: [{ next_version: 1 }] }));

      const versionNumber = (versionResult.rows[0] as { next_version: unknown })?.next_version as number;
      const versionId = uuidv4();

      await this.dbManager.queryProject(
        projectId,
        `INSERT INTO file_versions (id, project_id, file_id, version_number, filename, path, size, uploaded_by, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          versionId,
          projectId,
          fileId,
          versionNumber,
          file.originalname,
          file.path,
          file.size,
          userId,
          new Date().toISOString(),
        ]
      ).catch(() => ({}));

      // Query back the inserted row
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM file_versions WHERE id = $1",
        [versionId]
      ).catch(() => ({ rows: [] }));

      return result.rows[0] || {};
    } catch (error) {
      console.error("Error uploading file version:", error);
      throw error;
    }
  }

  /**
   * Restore file version
   */
  async restoreFileVersion(
    projectId: string,
    fileId: string,
    versionId: string
  ): Promise<FileRecord> {
    try {
      // File versions should be in project DBs
      const version = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM file_versions WHERE id = $1 AND project_id = $2 AND file_id = $3",
        [versionId, projectId, fileId]
      ).catch(() => ({ rows: [] }));

      if (version.rows.length === 0) {
        throw new Error("Version not found");
      }

      // Update the main file with version data (from project DB)
      await this.dbManager.queryProject(
        projectId,
        "UPDATE files SET filename = $1, path = $2, size = $3 WHERE id = $4 AND project_id = $5",
        [
          (version.rows[0] as { filename: string; path: string; size: number }).filename,
          (version.rows[0] as { filename: string; path: string; size: number }).path,
          (version.rows[0] as { filename: string; path: string; size: number }).size,
          fileId,
          projectId,
        ]
      );

      // Get the file after restoration
      const fileResult = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      return fileResult.rows.length > 0
        ? this.mapFile(fileResult.rows[0] as unknown as Record<string, unknown>)
        : null;
    } catch (error) {
      console.error("Error restoring file version:", error);
      throw error;
    }
  }

  /**
   * Make file public
   */
  async makeFilePublic(projectId: string, fileId: string): Promise<FileRecord> {
    try {
      // Get existing metadata first
      const existingFile = await this.dbManager.queryProject(
        projectId,
        "SELECT metadata FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      if (existingFile.rows.length === 0) {
        throw new Error("File not found");
      }

      // Merge metadata
      const existingMetadata = JSON.parse(existingFile.rows[0].metadata as string || "{}");
      const updatedMetadata = { ...existingMetadata, public: true, public_at: new Date().toISOString() };

      // Files are in project DBs
      await this.dbManager.queryProject(
        projectId,
        "UPDATE files SET metadata = $1 WHERE id = $2 AND project_id = $3",
        [JSON.stringify(updatedMetadata), fileId, projectId]
      );

      // Query back the updated row
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      return this.mapFile(result.rows[0]);
    } catch (error) {
      console.error("Error making file public:", error);
      throw error;
    }
  }

  /**
   * Make file private (files are in project DBs)
   */
  async makeFilePrivate(
    projectId: string,
    fileId: string
  ): Promise<FileRecord> {
    try {
      // Get existing metadata first
      const existingFile = await this.dbManager.queryProject(
        projectId,
        "SELECT metadata FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      if (existingFile.rows.length === 0) {
        throw new Error("File not found");
      }

      // Merge metadata
      const existingMetadata = JSON.parse(existingFile.rows[0].metadata as string || "{}");
      const updatedMetadata = { ...existingMetadata, public: false, private_at: new Date().toISOString() };

      // Files are in project DBs
      await this.dbManager.queryProject(
        projectId,
        "UPDATE files SET metadata = $1 WHERE id = $2 AND project_id = $3",
        [JSON.stringify(updatedMetadata), fileId, projectId]
      );

      // Query back the updated row
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM files WHERE id = $1 AND project_id = $2",
        [fileId, projectId]
      );

      return this.mapFile(result.rows[0]);
    } catch (error) {
      console.error("Error making file private:", error);
      throw error;
    }
  }

  /**
   * Reset project data for testing
   */
  async resetProjectData(projectId: string): Promise<void> {
    try {
      // Delete all project-specific data from project DB
      await this.dbManager.queryProject(projectId, "DELETE FROM documents", []).catch(() => ({}));
      await this.dbManager.queryProject(projectId, "DELETE FROM collections", []).catch(() => ({}));
      await this.dbManager.queryProject(projectId, "DELETE FROM files", []).catch(() => ({}));
      await this.dbManager.queryProject(projectId, "DELETE FROM folders", []).catch(() => ({}));
      await this.dbManager.queryProject(projectId, "DELETE FROM api_keys", []).catch(() => ({}));
      await this.dbManager.queryProject(projectId, "DELETE FROM project_users", []).catch(() => ({}));
      await this.dbManager.queryProject(projectId, "DELETE FROM file_permissions", []).catch(() => ({}));
      await this.dbManager.queryProject(projectId, "DELETE FROM file_versions", []).catch(() => ({}));
      await this.dbManager.queryProject(projectId, "DELETE FROM changelog", []).catch(() => ({}));

      // Reset project stats in main DB
      await this.dbManager.queryMain(
        "UPDATE projects SET storage_used = 0, api_calls_count = 0, last_api_call = NULL WHERE id = $1",
        [projectId]
      );

      console.log(`Reset project data for project ${projectId}`);
    } catch (error) {
      console.error("Error resetting project data:", error);
      throw error;
    }
  }

  /**
   * Reset all test data
   */
  async resetAllTestData(): Promise<void> {
    try {
      // Get all test projects from main DB
      const testProjects = await this.dbManager.queryMain(
        "SELECT id FROM projects WHERE name LIKE '%test%' OR name LIKE '%Test%'"
      );

      for (const project of testProjects.rows) {
        await this.resetProjectData((project as { id: string }).id);
      }

      console.log("Reset all test data");
    } catch (error) {
      console.error("Error resetting all test data:", error);
      throw error;
    }
  }

  /**
   * Validate database schema
   */
  async validateSchema(): Promise<{
    valid: boolean;
    issues: string[];
    tables: string[];
  }> {
    try {
      const issues: string[] = [];
      const tables: string[] = [];

      // Check if required tables exist
      const requiredTables = [
        "admin_users",
        "projects",
        "project_users",
        "collections",
        "documents",
        "files",
        "folders",
        "api_keys",
        "sessions",
        "changelog",
      ];

      for (const table of requiredTables) {
        try {
          const result = await this.adapter.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            [table]
          );

          if (result.rows.length > 0) {
            tables.push(table);
          } else {
            issues.push(`Missing table: ${table}`);
          }
        } catch (error) {
          issues.push(`Error checking table ${table}: ${error}`);
        }
      }

      // Check if required columns exist in key tables
      const requiredColumns = {
        projects: ["id", "name", "api_key", "created_at"],
        collections: ["id", "project_id", "name", "fields"],
        documents: ["id", "project_id", "collection_name", "data"],
        files: ["id", "project_id", "filename", "path", "size"],
      };

      for (const [table, columns] of Object.entries(requiredColumns)) {
        for (const column of columns) {
          try {
            // PRAGMA doesn't support parameters - use string interpolation (table is validated)
            const result = await this.adapter.query(
              `PRAGMA table_info("${table}")`
            );
            
            const columnExists = result.rows.some((row) => (row as { name: string }).name === column);
            if (!columnExists) {
              issues.push(`Missing column: ${table}.${column}`);
            }
          } catch (error) {
            issues.push(`Error checking column ${table}.${column}: ${error}`);
          }
        }
      }

      const valid = issues.length === 0;

      return {
        valid,
        issues,
        tables,
      };
    } catch (error) {
      console.error("Error validating schema:", error);
      throw error;
    }
  }

  /**
   * Seed project data for testing
   */
  async seedProjectData(
    projectId: string,
    seedType: string,
    _options: Record<string, unknown> = {}
  ): Promise<{
    collections: number;
    documents: number;
    files: number;
    users: number;
  }> {
    try {
      let collections = 0;
      let documents = 0;
      const files = 0;
      const users = 0;

      switch (seedType) {
        case "basic": {
          // Create basic collections
          const basicCollections = [
            {
              name: "users",
              fields: [
                {
                  name: "name",
                  type: FieldType.string,
                  required: true,
                  unique: false,
                },
                {
                  name: "email",
                  type: FieldType.string,
                  required: true,
                  unique: true,
                },
              ],
            },
            {
              name: "products",
              fields: [
                {
                  name: "title",
                  type: FieldType.string,
                  required: true,
                  unique: false,
                },
                {
                  name: "price",
                  type: FieldType.number,
                  required: true,
                  unique: false,
                },
              ],
            },
          ];

          for (const collData of basicCollections) {
            await this.createCollection(
              projectId,
              collData.name,
              { fields: collData.fields },
              "system"
            );
            collections++;
          }
          break;
        }

        case "full": {
          // Create comprehensive test data
          const fullCollections = [
            {
              name: "users",
              fields: [
                {
                  name: "name",
                  type: FieldType.string,
                  required: true,
                  unique: false,
                },
                {
                  name: "email",
                  type: FieldType.string,
                  required: true,
                  unique: true,
                },
                {
                  name: "age",
                  type: FieldType.number,
                  required: false,
                  unique: false,
                },
              ],
            },
            {
              name: "products",
              fields: [
                {
                  name: "title",
                  type: FieldType.string,
                  required: true,
                  unique: false,
                },
                {
                  name: "price",
                  type: FieldType.number,
                  required: true,
                  unique: false,
                },
                {
                  name: "description",
                  type: FieldType.string,
                  required: false,
                  unique: false,
                },
              ],
            },
            {
              name: "orders",
              fields: [
                {
                  name: "user_id",
                  type: FieldType.string,
                  required: true,
                  unique: false,
                },
                {
                  name: "total",
                  type: FieldType.number,
                  required: true,
                  unique: false,
                },
                {
                  name: "status",
                  type: FieldType.string,
                  required: false,
                  unique: false,
                },
              ],
            },
          ];

          for (const collData of fullCollections) {
            await this.createCollection(
              projectId,
              collData.name,
              { fields: collData.fields },
              "system"
            );
            collections++;

            // Add sample documents
            const sampleDocs = this.generateSampleDocuments(collData.name, 5);
            for (const docData of sampleDocs) {
              await this.createDocument(
                projectId,
                collData.name,
                docData,
                "system"
              );
              documents++;
            }
          }
          break;
        }

        default:
          throw new Error(`Unknown seed type: ${seedType}`);
      }

      return { collections, documents, files, users };
    } catch (error) {
      console.error("Error seeding project data:", error);
      throw error;
    }
  }

  /**
   * Generate sample documents for testing
   */
  private generateSampleDocuments(
    collectionName: string,
    count: number
  ): Record<string, unknown>[] {
    const documents: Record<string, unknown>[] = [];

    for (let i = 0; i < count; i++) {
      switch (collectionName) {
        case "users":
          documents.push({
            name: `Test User ${i + 1}`,
            email: `user${i + 1}@test.com`,
            age: 20 + i,
          });
          break;

        case "products":
          documents.push({
            title: `Test Product ${i + 1}`,
            price: 10.99 + i * 5,
            description: `This is test product ${i + 1}`,
          });
          break;

        case "orders":
          documents.push({
            user_id: `user_${i + 1}`,
            total: 50.0 + i * 10,
            status: i % 2 === 0 ? "pending" : "completed",
          });
          break;

        default:
          documents.push({ id: i + 1, name: `Item ${i + 1}` });
      }
    }

    return documents;
  }

  /**
   * Get changelog statistics for a project
   */
  async getChangelogStatistics(
    projectId: string,
    options: {
      period: string;
      start_date?: string;
      end_date?: string;
      group_by: string;
    }
  ): Promise<{
    total_entries: number;
    by_action_type: Record<string, number>;
    by_user: Record<string, number>;
    by_entity_type: Record<string, number>;
    timeline: Array<{ date: string; count: number }>;
  }> {
    try {
      let whereClause = "WHERE project_id = $1";
      const params = [projectId];
      let paramCount = 1;

      if (options.start_date) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        params.push(options.start_date);
      }

      if (options.end_date) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        params.push(options.end_date);
      }

      // Changelog is in project DBs
      // Get total entries (from project DB)
      const totalResult = await this.dbManager.queryProject(
        projectId,
        `SELECT COUNT(*) as count FROM changelog ${whereClause}`,
        params
      );
      const totalEntries = parseInt(String(totalResult.rows[0]?.count || 0));

      // Get by action type (from project DB)
      const actionTypeResult = await this.dbManager.queryProject(
        projectId,
        `SELECT action, COUNT(*) as count FROM changelog ${whereClause} GROUP BY action`,
        params
      );
      const byActionType: Record<string, number> = {};
      actionTypeResult.rows.forEach((row) => {
        const typedRow = row as { action: string; count: unknown };
        byActionType[typedRow.action] = parseInt(String(typedRow.count || 0));
      });

      // Get by user (from project DB)
      const userResult = await this.dbManager.queryProject(
        projectId,
        `SELECT user_id, COUNT(*) as count FROM changelog ${whereClause} GROUP BY user_id`,
        params
      );
      const byUser: Record<string, number> = {};
      userResult.rows.forEach((row) => {
        const typedRow = row as { user_id: string; count: unknown };
        byUser[typedRow.user_id] = parseInt(String(typedRow.count || 0));
      });

      // Get by entity type (from project DB)
      const entityTypeResult = await this.dbManager.queryProject(
        projectId,
        `SELECT entity_type, COUNT(*) as count FROM changelog ${whereClause} GROUP BY entity_type`,
        params
      );
      const byEntityType: Record<string, number> = {};
      entityTypeResult.rows.forEach((row) => {
        const typedRow = row as { entity_type: string; count: unknown };
        byEntityType[typedRow.entity_type] = parseInt(String(typedRow.count || 0));
      });

      // Get timeline data (SQLite doesn't support DATE_TRUNC, use strftime instead) - from project DB
      let timelineQuery = `SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count FROM changelog ${whereClause}`;
      if (options.period === "day") {
        timelineQuery += " GROUP BY date(created_at) ORDER BY date";
      } else if (options.period === "week") {
        timelineQuery +=
          " GROUP BY strftime('%Y-%W', created_at) ORDER BY date";
      } else if (options.period === "month") {
        timelineQuery +=
          " GROUP BY strftime('%Y-%m', created_at) ORDER BY date";
      }

      const timelineResult = await this.dbManager.queryProject(
        projectId,
        timelineQuery,
        params
      );
      const timeline = timelineResult.rows.map((row) => {
        const typedRow = row as { date: unknown; count: unknown };
        return {
          date: String(typedRow.date || ""),
          count: parseInt(String(typedRow.count || 0)),
        };
      });

      return {
        total_entries: totalEntries,
        by_action_type: byActionType,
        by_user: byUser,
        by_entity_type: byEntityType,
        timeline,
      };
    } catch (error) {
      console.error("Error getting changelog statistics:", error);
      throw error;
    }
  }

  /**
   * Export changelog data
   */
  async exportChangelog(
    projectId: string,
    options: {
      format: string;
      start_date?: string;
      end_date?: string;
      action_type?: string;
      user_id?: string;
      entity_type?: string;
    }
  ): Promise<{
    format: string;
    data: Record<string, unknown>[];
    filename: string;
    download_url: string;
  }> {
    try {
      let whereClause = "WHERE project_id = $1";
      const params = [projectId];
      let paramCount = 1;

      if (options.start_date) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        params.push(options.start_date);
      }

      if (options.end_date) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        params.push(options.end_date);
      }

      if (options.action_type) {
        paramCount++;
        whereClause += ` AND action = $${paramCount}`;
        params.push(options.action_type);
      }

      if (options.user_id) {
        paramCount++;
        whereClause += ` AND user_id = $${paramCount}`;
        params.push(options.user_id);
      }

      if (options.entity_type) {
        paramCount++;
        whereClause += ` AND entity_type = $${paramCount}`;
        params.push(options.entity_type);
      }

      // Changelog is in project DBs
      const result = await this.dbManager.queryProject(
        projectId,
        `SELECT * FROM changelog ${whereClause} ORDER BY created_at DESC`,
        params
      );

      const data = result.rows;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `changelog_${projectId}_${timestamp}.${options.format}`;

      // In a real implementation, you'd save this to a file and return a download URL
      const downloadUrl = `/api/changelog/export/${projectId}/download/${filename}`;

      return {
        format: options.format,
        data,
        filename,
        download_url: downloadUrl,
      };
    } catch (error) {
      console.error("Error exporting changelog:", error);
      throw error;
    }
  }

  /**
   * Purge old changelog entries
   */
  async purgeOldChangelog(options: {
    older_than_days: number;
    project_id?: string;
    action_type?: string;
    entity_type?: string;
  }): Promise<{
    purged: number;
    errors: string[];
  }> {
    try {
      const result = {
        purged: 0,
        errors: [] as string[],
      };

      // Changelog is in project DBs - need project_id
      if (!options.project_id) {
        throw new Error("project_id is required for purgeOldChangelog");
      }

      let whereClause = "WHERE created_at < datetime('now', '-' || $1 || ' days')";
      const params: (number | string)[] = [options.older_than_days];
      let paramCount = 1;

      // Project ID is required
      paramCount++;
      whereClause += ` AND project_id = $${paramCount}`;
      params.push(options.project_id);

      if (options.action_type) {
        paramCount++;
        whereClause += ` AND action = $${paramCount}`;
        params.push(options.action_type);
      }

      if (options.entity_type) {
        paramCount++;
        whereClause += ` AND entity_type = $${paramCount}`;
        params.push(options.entity_type);
      }

      // Delete from project DB
      const deleteResult = await this.dbManager.queryProject(
        options.project_id,
        `DELETE FROM changelog ${whereClause}`,
        params
      );

      result.purged = deleteResult.rowCount || 0;

      return result;
    } catch (error) {
      console.error("Error purging old changelog:", error);
      throw error;
    }
  }

  async createAdminApiKey(apiKey: {
    name: string;
    user_id: string;
    key: string;
    type: string;
    scopes: Scope[];
    project_ids: string[] | null;
    created_by: string;
    created_at: string;
    last_used_at: string | null;
    active: boolean;
    expires_at?: string;
    rate_limit?: number;
    metadata?: Record<string, unknown>;
  }): Promise<BackendApiKey> {
    await this.ensureReady();
    const apiKeyId = uuidv4();
    const key = apiKey.key || `krapi_${uuidv4().replace(/-/g, "")}`;

    // Admin/system API keys go to main DB
    await this.dbManager.queryMain(
      `INSERT INTO api_keys (id, key, name, type, owner_id, scopes, project_ids, expires_at, rate_limit, metadata, is_active, created_at, last_used_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        apiKeyId,
        key,
        apiKey.name,
        apiKey.type || "admin",
        apiKey.user_id,
        JSON.stringify(apiKey.scopes),
        apiKey.project_ids ? JSON.stringify(apiKey.project_ids) : JSON.stringify([]),
        apiKey.expires_at || null,
        apiKey.rate_limit || null,
        JSON.stringify(apiKey.metadata || {}),
        apiKey.active ? 1 : 0,
        apiKey.created_at,
        apiKey.last_used_at || null,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE id = $1",
      [apiKeyId]
    );

    return this.mapApiKey(result.rows[0]);
  }

  async getProjectsByOwner(_ownerId: string): Promise<BackendProject[]> {
    // Implement the logic to retrieve projects by owner
    // This is a placeholder implementation
    return [];
  }

  /**
   * Get all collections for a project
   */
  async getCollections(projectId: string): Promise<Collection[]> {
    try {
      // Collections are in project DBs
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM collections WHERE project_id = $1 ORDER BY created_at DESC",
        [projectId]
      );
      return result.rows.map((row) => this.mapCollection(row));
    } catch (error) {
      console.error("Error getting collections:", error);
      throw error;
    }
  }

  /**
   * Get a collection by name for a project
   */
  async getCollectionByName(
    projectId: string,
    collectionName: string
  ): Promise<Collection | null> {
    try {
      // Collections are in project DBs
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM collections WHERE project_id = $1 AND name = $2",
        [projectId, collectionName]
      );
      return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
    } catch (error) {
      console.error("Error getting collection by name:", error);
      throw error;
    }
  }

  // Fast initialization for development mode - skips heavy operations
  private async initializeFast(): Promise<void> {
    try {
      console.log("🔧 Fast database initialization for development...");

      // Connect to the database first
      await this.adapter.connect();

      // Test basic connection
      await this.adapter.query("SELECT 1");

      console.log("✅ Database connection successful");

      // Check if database is already initialized (tables exist)
      const isInitialized = await this.isDatabaseInitialized();

      if (isInitialized) {
        console.log("✅ Database already initialized, skipping table creation");
      } else {
        console.log("🆕 First time setup: Creating essential tables...");
        // Create only essential tables without heavy validation
        const tablesCreated = await this.createEssentialTables();

        if (tablesCreated) {
          // Create default admin user if it doesn't exist
          await this.ensureDefaultAdmin();
          console.log("✅ Database initialization completed");
        } else {
          console.log("⚠️ Tables were not created, skipping admin creation");
        }
      }

      this.isConnected = true;
      this.readyResolve();
    } catch (error) {
      console.error("Fast initialization failed:", error);
      throw error;
    }
  }

  // Check if database is already initialized by looking for key tables
  private async isDatabaseInitialized(): Promise<boolean> {
    try {
      // SQLite doesn't use connection pooling - adapter is already connected
      try {
        // Check if admin_users table exists and has data (SQLite uses sqlite_master)
        const tableExistsResult = await this.adapter.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='admin_users'`
        );
        const hasDataResult = await this.adapter.query(`SELECT COUNT(*) as count FROM admin_users LIMIT 1`);
        const tableExists = tableExistsResult.rows.length > 0;
        const hasData = parseInt(String(hasDataResult.rows[0]?.count || 0)) > 0;
        const result = { rows: [{ exists: tableExists && hasData ? 1 : 0 }] };

        const exists = result.rows[0]?.exists as number;
        return exists === 1;
      } finally {
        // SQLite doesn't need connection release
      }
    } catch {
      // If we can't check, assume not initialized
      return false;
    }
  }

  // Create only essential tables for development
  private static isCreatingTables = false;

  public async createEssentialTables(): Promise<boolean> {
    // Prevent multiple simultaneous calls
    if (DatabaseService.isCreatingTables) {
      console.log("⚠️ Table creation already in progress, skipping...");
      return false;
    }

    DatabaseService.isCreatingTables = true;
    try {
      // SQLite doesn't have PostgreSQL extensions - UUIDs are generated in application code
      // Only create the most essential tables with SQLite-compatible syntax
      await this.adapter.query(`
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

      await this.adapter.query(`
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

      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS collections (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          fields TEXT NOT NULL DEFAULT '[]',
          indexes TEXT NOT NULL DEFAULT '[]',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT NOT NULL REFERENCES admin_users(id),
          UNIQUE(project_id, name)
        )
      `);

      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
          data TEXT NOT NULL DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT NOT NULL REFERENCES admin_users(id)
        )
      `);

      // Project Users Table (for project-specific user accounts)
      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS project_users (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          username TEXT NOT NULL,
          email TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          phone TEXT,
          is_verified INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          scopes TEXT NOT NULL DEFAULT '[]',
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_login TEXT,
          email_verified_at TEXT,
          phone_verified_at TEXT,
          UNIQUE(project_id, username),
          UNIQUE(project_id, email)
        )
      `);

      // Create indexes for project users
      await this.adapter.query(`
        CREATE INDEX IF NOT EXISTS idx_project_users_project ON project_users(project_id)
      `);
      await this.adapter.query(`
        CREATE INDEX IF NOT EXISTS idx_project_users_email ON project_users(project_id, email)
      `);
      await this.adapter.query(`
        CREATE INDEX IF NOT EXISTS idx_project_users_username ON project_users(project_id, username)
      `);

      // Add missing essential tables for auth system
      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          user_id TEXT REFERENCES admin_users(id),
          project_id TEXT REFERENCES projects(id),
          type TEXT NOT NULL CHECK (type IN ('admin', 'project')),
          scopes TEXT NOT NULL DEFAULT '[]',
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          expires_at TEXT NOT NULL,
          consumed INTEGER DEFAULT 0,
          consumed_at TEXT,
          last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1
        )
      `);

      await this.adapter.query(`
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

      // Add files table for project statistics
      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          path TEXT NOT NULL,
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          uploaded_by TEXT REFERENCES admin_users(id)
        )
      `);

      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS changelog (
          id TEXT PRIMARY KEY,
          project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changes TEXT DEFAULT '{}',
          performed_by TEXT REFERENCES admin_users(id),
          session_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create default admin user if it doesn't exist
      const adminCount = await this.adapter.query("SELECT COUNT(*) as count FROM admin_users");
      if (parseInt(String(adminCount.rows[0]?.["count"] || 0)) === 0) {
        const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
        const defaultPassword =
          process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
        const defaultEmail =
          process.env.DEFAULT_ADMIN_EMAIL || "admin@krapi.local";

        const hashedPassword = await this.hashPassword(defaultPassword);
        const adminId = uuidv4();
        const masterApiKey = `mak_${uuidv4().replace(/-/g, "")}`;

        await this.adapter.query(
          `INSERT INTO admin_users (id, username, email, password_hash, role, access_level, api_key, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            adminId,
            defaultUsername,
            defaultEmail,
            hashedPassword,
            "master_admin",
            "full",
            masterApiKey,
            1,
          ]
        );
        console.log(`✅ Default admin user created: ${defaultUsername}`);
        console.log(`🔑 Master API Key: ${masterApiKey}`);
      }

      // SQLite auto-commits
      console.log("✅ Essential tables and admin user created");
      return true;
    } catch (error) {
      // SQLite handles rollback automatically
      throw error;
    } finally {
      // SQLite doesn't need connection release
      DatabaseService.isCreatingTables = false;
    }
  }

  // Ensure default admin user exists
  private async ensureDefaultAdmin(): Promise<void> {
    // SQLite doesn't use connection pooling - adapter is already connected
    try {
      const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@localhost";

      const result = await this.adapter.query(
        "SELECT id FROM admin_users WHERE username = $1",
        [defaultUsername]
      );

      if (result.rows.length === 0) {
        const hashedPassword = await this.hashPassword(defaultPassword);
        const adminId = uuidv4();
        const masterApiKey = `mak_${uuidv4().replace(/-/g, "")}`;

        await this.adapter.query(
          `INSERT INTO admin_users (id, username, email, password_hash, role, access_level, api_key, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            adminId,
            defaultUsername,
            defaultEmail,
            hashedPassword,
            "master_admin",
            "full",
            masterApiKey,
            1, // Default admin is active by default (SQLite uses INTEGER 1 for true)
          ]
        );
        console.log(`✅ Default admin user created: ${defaultUsername}`);
        console.log(`🔑 Master API Key: ${masterApiKey}`);
        console.log(
          "⚠️  IMPORTANT: Change the default admin password after first login!"
        );
      }
    } catch (error) {
      console.error("Failed to create default admin:", error);
      // Don't throw - this is not critical for development
    } finally {
      // SQLite doesn't need connection release
    }
  }

  // Ultra-fast initialization - just connect, no initialization
  private async initializeUltraFast(): Promise<void> {
    try {
      console.log(
        "🚀 Ultra-fast database connection (skipping initialization)..."
      );

      // Connect to the database first
      await this.adapter.connect();

      // Test basic connection
      await this.adapter.query("SELECT 1");

      console.log("✅ Database connection successful");

      // Mark as connected immediately
      this.isConnected = true;
      this.readyResolve();
    } catch (error) {
      console.error("Ultra-fast initialization failed:", error);
      throw error;
    }
  }

  // Instant initialization - no database operations at all
  private async initializeInstant(): Promise<void> {
    try {
      console.log(
        "⚡ Instant database initialization (checking if tables exist)..."
      );

      // Connect to the database first
      await this.adapter.connect();

      // Check if database is already initialized
      const isInitialized = await this.isDatabaseInitialized();

      if (isInitialized) {
        console.log("✅ Database already initialized, marking as ready");
        this.isConnected = true;
        this.readyResolve();
      } else {
        console.log(
          "🔄 Tables don't exist, falling back to fast initialization..."
        );

        // In development mode, mark as ready immediately and create tables in background
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🚀 Development mode: Marking database as ready immediately"
          );
          this.isConnected = true;
          this.readyResolve();

          // Create tables in background (non-blocking)
          this.initializeFast().catch((error) => {
            console.error("Background table creation failed:", error);
          });
        } else {
          // Fall back to fast initialization to create tables
          await this.initializeFast();
        }
      }
    } catch (error) {
      console.error("Instant initialization failed:", error);
      // Fall back to fast initialization
      console.log("🔄 Falling back to fast initialization due to error...");
      await this.initializeFast();
    }
  }
}
