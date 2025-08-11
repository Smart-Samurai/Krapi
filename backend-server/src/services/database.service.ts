import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";
import {
  AdminUser,
  AdminRole,
  AccessLevel,
  AdminPermission,
  Project,
  ProjectSettings,
  Document,
  FileRecord,
  ProjectUser,
  Session,
  SessionType,
  ChangelogEntry,
  ChangeAction,
  Collection,
  CollectionField,
  CollectionIndex,
  ApiKey,
  Scope,
} from "@/types";
import { MigrationService } from "./migration.service";

export class DatabaseService {
  private pool: Pool;
  private static instance: DatabaseService;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 10;
  private migrationService: MigrationService;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private lastHealthCheck: Date | null = null;
  private healthCheckInterval: number = 60000; // 1 minute

  private constructor() {
    // Create the ready promise
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    // PostgreSQL connection configuration
    this.pool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "krapi",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // Increased from 2000
    });

    // Set up error handlers
    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });

    // Initialize with proper error handling
    this.initializeWithRetry().catch((error) => {
      console.error("Database initialization failed:", error);
      this.readyReject(error);
    });
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

  // Public method to get a database connection
  async getConnection() {
    return this.pool.connect();
  }

  async runSchemaFixes(): Promise<void> {
    if (!this.migrationService) {
      throw new Error("Migration service not initialized");
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
    details?: any;
  }> {
    try {
      // Check connection
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();

      // Check critical tables
      const criticalTables = [
        "admin_users",
        "projects",
        "collections",
        "documents",
        "sessions",
        "api_keys",
        "changelog",
        "migrations",
      ];

      const missingTables = [];
      for (const table of criticalTables) {
        const result = await this.pool.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
          [table]
        );
        if (!result.rows[0].exists) {
          missingTables.push(table);
        }
      }

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
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
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
        await this.initializeTables();
        repairs.push("Re-initialized missing tables");
      }

      // Run migrations
      console.log("Running migrations...");
      await this.migrationService.runMigrations();
      repairs.push("Ran database migrations");

      // Fix schema
      console.log("Checking and fixing schema...");
      await this.migrationService.checkAndFixSchema();
      repairs.push("Fixed database schema");

      // Fix missing columns
      console.log("Checking and fixing missing columns...");
      await this.fixMissingColumns();
      repairs.push("Fixed missing columns");

      // Create default admin if none exists
      const adminCount = await this.pool.query(
        "SELECT COUNT(*) FROM admin_users"
      );
      if (parseInt(adminCount.rows[0].count) === 0) {
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
      await this.waitForReady();
    }

    // Periodic health check
    if (
      !this.lastHealthCheck ||
      Date.now() - this.lastHealthCheck.getTime() > this.healthCheckInterval
    ) {
      const health = await this.checkHealth();
      if (!health.healthy) {
        console.warn("Database health check failed, attempting auto-repair...");
        await this.autoRepair();
      }
    }
  }

  private async initializeWithRetry() {
    while (
      this.connectionAttempts < this.maxConnectionAttempts &&
      !this.isConnected
    ) {
      this.connectionAttempts++;
      console.log(
        `Attempting to connect to PostgreSQL (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})...`
      );

      try {
        // Test the connection
        const client = await this.pool.connect();
        await client.query("SELECT 1");
        client.release();

        this.isConnected = true;
        console.log("Successfully connected to PostgreSQL");

        // Initialize tables first
        await this.initializeTables();

        // Initialize migration service
        this.migrationService = new MigrationService(this.pool);

        // Run migrations after tables are created
        await this.migrationService.runMigrations();

        // Check and fix schema integrity
        await this.migrationService.checkAndFixSchema();

        // Resolve the ready promise on successful initialization
        this.readyResolve();
        break;
      } catch (error) {
        console.error(
          `Failed to connect to PostgreSQL (attempt ${this.connectionAttempts}):`,
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
            "Max connection attempts reached. Please ensure PostgreSQL is running."
          );
          const connectionError = new Error(
            "Failed to connect to PostgreSQL after multiple attempts"
          );
          this.readyReject(connectionError);
          throw connectionError;
        }
      }
    }
  }

  private async initializeTables() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Ensure required extension for gen_random_uuid()
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

      // Admin Users Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('master_admin', 'admin', 'developer')),
          access_level VARCHAR(50) NOT NULL CHECK (access_level IN ('full', 'read_write', 'read_only')),
          permissions TEXT[] DEFAULT '{}',
          scopes TEXT[] DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          login_count INTEGER DEFAULT 0,
          api_key VARCHAR(255) UNIQUE
        )
      `);

      // API Keys Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('master', 'admin', 'project')),
          owner_id UUID NOT NULL,
          scopes TEXT[] NOT NULL DEFAULT '{}',
          project_ids UUID[] DEFAULT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          expires_at TIMESTAMP,
          last_used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true
        )
      `);

      // Create indexes for API keys
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE is_active = true
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_id)
      `);

      // Projects Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          project_url VARCHAR(500),
          api_key VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES admin_users(id),
          settings JSONB DEFAULT '{}'::jsonb,
          storage_used BIGINT DEFAULT 0,
          api_calls_count BIGINT DEFAULT 0,
          last_api_call TIMESTAMP
        )
      `);

      // Project Users Table (for admin access to projects)
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_admins (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, admin_user_id)
        )
      `);

      // Project Users Table (for project-specific user accounts)
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          is_verified BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          scopes TEXT[] NOT NULL DEFAULT '{}',
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          email_verified_at TIMESTAMP,
          phone_verified_at TIMESTAMP,
          UNIQUE(project_id, username),
          UNIQUE(project_id, email)
        )
      `);

      // Create indexes for project users
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_project_users_project ON project_users(project_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_project_users_email ON project_users(project_id, email)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_project_users_username ON project_users(project_id, username)
      `);

      // Collections Table (formerly table_schemas)
      await client.query(`
        CREATE TABLE IF NOT EXISTS collections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          fields JSONB NOT NULL DEFAULT '[]'::jsonb,
          indexes JSONB DEFAULT '[]'::jsonb,
          document_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES admin_users(id),
          UNIQUE(project_id, name)
        )
      `);

      // Documents Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
          collection_name VARCHAR(255) NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES admin_users(id),
          updated_by UUID REFERENCES admin_users(id)
        )
      `);

      // Create indexes for documents
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_project_collection 
        ON documents(project_id, collection_name)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_collection_id 
        ON documents(collection_id)
      `);

      // Files Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(255) NOT NULL,
          size BIGINT NOT NULL,
          path VARCHAR(500) NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          uploaded_by UUID REFERENCES admin_users(id)
        )
      `);

      // Sessions Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          token VARCHAR(500) UNIQUE NOT NULL,
          user_id UUID REFERENCES admin_users(id),
          project_id UUID REFERENCES projects(id),
          type VARCHAR(50) NOT NULL CHECK (type IN ('admin', 'project')),
          scopes TEXT[] NOT NULL DEFAULT '{}',
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          consumed BOOLEAN DEFAULT false,
          consumed_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true
        )
      `);

      // Create index for sessions
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)
      `);

      // Changelog Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS changelog (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          action VARCHAR(50) NOT NULL,
          changes JSONB DEFAULT '{}'::jsonb,
          performed_by UUID REFERENCES admin_users(id),
          session_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Email Templates Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          body TEXT NOT NULL,
          variables JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // System checks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_checks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          check_type VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          details JSONB DEFAULT '{}'::jsonb,
          last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(check_type)
        )
      `);

      // Create updated_at trigger function
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Create triggers for updated_at
      const tablesWithUpdatedAt = [
        "admin_users",
        "projects",
        "collections",
        "documents",
        "email_templates",
      ];
      for (const table of tablesWithUpdatedAt) {
        await client.query(`
          DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
          CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table} 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);
      }

      await client.query("COMMIT");

      // Repair database structure if needed
      await this.repairDatabase();

      // Seed default data after tables are created
      await this.seedDefaultData();
    } catch (error) {
      await client.query("ROLLBACK");

      // Log more detailed error information
      console.error("Error during table initialization:", error);

      // Check if it's a specific PostgreSQL error
      if (error instanceof Error && "code" in error) {
        const pgError = error as any;

        // If it's a "column does not exist" error, it might mean tables are partially created
        if (pgError.code === "42703") {
          console.log(
            "Tables might be partially created. Attempting to drop and recreate..."
          );

          try {
            // Start a new transaction to clean up
            await client.query("BEGIN");

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
              await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            }

            // Drop the trigger function
            await client.query(
              `DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`
            );

            await client.query("COMMIT");

            console.log(
              "Cleaned up existing tables. Please restart the application."
            );
          } catch (cleanupError) {
            await client.query("ROLLBACK");
            console.error("Failed to clean up tables:", cleanupError);
          }
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }

  private async seedDefaultData() {
    try {
      // Check if master admin exists
      const result = await this.pool.query(
        "SELECT id FROM admin_users WHERE username = $1",
        ["admin"]
      );

      let adminId: string;
      let masterApiKey: string;

      if (result.rows.length === 0) {
        // Create default master admin with API key
        const hashedPassword = await bcrypt.hash("admin123", 10);
        masterApiKey = `mak_${uuidv4().replace(/-/g, "")}`;

        const adminResult = await this.pool.query(
          `INSERT INTO admin_users (username, email, password_hash, role, access_level, api_key) 
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            "admin",
            "admin@krapi.com",
            hashedPassword,
            "master_admin",
            "full",
            masterApiKey,
          ]
        );
        adminId = adminResult.rows[0].id;
        console.log("Default master admin created");
      } else {
        adminId = result.rows[0].id;

        // Ensure default admin has correct password and generate API key if missing
        const defaultPassword =
          process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Check if admin has API key
        const adminResult = await this.pool.query(
          "SELECT api_key FROM admin_users WHERE username = $1",
          ["admin"]
        );

        if (!adminResult.rows[0].api_key) {
          masterApiKey = `mak_${uuidv4().replace(/-/g, "")}`;
          await this.pool.query(
            `UPDATE admin_users 
             SET password_hash = $1, is_active = true, api_key = $2 
             WHERE username = $3`,
            [hashedPassword, masterApiKey, "admin"]
          );
          console.log(
            "Default master admin password reset and API key generated"
          );
        } else {
          masterApiKey = adminResult.rows[0].api_key;
          await this.pool.query(
            `UPDATE admin_users 
             SET password_hash = $1, is_active = true 
             WHERE username = $2`,
            [hashedPassword, "admin"]
          );
          console.log("Default master admin password reset to default");
        }
      }

      // Create or update master API key in api_keys table
      if (masterApiKey) {
        await this.pool.query(
          `
          INSERT INTO api_keys (key, name, type, owner_id, scopes, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (key) 
          DO UPDATE SET 
            is_active = true,
            scopes = $5
        `,
          [
            masterApiKey,
            "Master API Key",
            "master",
            adminId,
            ["master"], // Master scope gives full access
            true,
          ]
        );

        console.log(`Master API Key: ${masterApiKey}`);
        console.log(
          "⚠️  Save this API key securely - it will not be shown again!"
        );
      }

      // Create a system check table to track initialization
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS system_checks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          check_type VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          details JSONB DEFAULT '{}'::jsonb,
          last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(check_type)
        )
      `);

      // Record successful initialization
      await this.pool.query(
        `
        INSERT INTO system_checks (check_type, status, details)
        VALUES ('database_initialization', 'success', $1)
        ON CONFLICT (check_type) 
        DO UPDATE SET 
          status = 'success',
          details = $1,
          last_checked = CURRENT_TIMESTAMP
      `,
        [
          JSON.stringify({
            version: "1.0.0",
            initialized_at: new Date().toISOString(),
            default_admin_created: result.rows.length === 0,
          }),
        ]
      );
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
      initialization: { status: boolean; message: string; details?: any };
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
      // Check database connection
      try {
        await this.pool.query("SELECT 1");
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
        const tableCheckResult = await this.pool.query(
          `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ANY($1)
        `,
          [requiredTables]
        );

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

      // Check default admin exists and is active
      try {
        const adminResult = await this.pool.query(
          "SELECT id, is_active FROM admin_users WHERE username = $1",
          ["admin"]
        );

        if (adminResult.rows.length > 0 && adminResult.rows[0].is_active) {
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

      // Check initialization status
      try {
        const initResult = await this.pool.query(
          `SELECT status, details, last_checked 
           FROM system_checks 
           WHERE check_type = 'database_initialization'`
        );

        if (
          initResult.rows.length > 0 &&
          initResult.rows[0].status === "success"
        ) {
          checks.initialization = {
            status: true,
            message: "Database properly initialized",
            details: initResult.rows[0].details,
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
      const anyUnhealthy = Object.values(checks).some((check) => !check.status);

      return {
        status: allHealthy
          ? "healthy"
          : anyUnhealthy
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
        console.log("Repairing: Fixing default admin...");
        await this.seedDefaultData();
        actions.push("Fixed default admin user");
      }

      // Record repair action
      await this.pool.query(
        `
        INSERT INTO system_checks (check_type, status, details)
        VALUES ('database_repair', 'success', $1)
        ON CONFLICT (check_type) 
        DO UPDATE SET 
          status = 'success',
          details = $1,
          last_checked = CURRENT_TIMESTAMP
      `,
        [
          JSON.stringify({
            actions,
            repaired_at: new Date().toISOString(),
          }),
        ]
      );

      return { success: true, actions };
    } catch (error) {
      console.error("Database repair failed:", error);
      return { success: false, actions };
    }
  }

  private async fixMissingColumns(): Promise<void> {
    try {
      // Check and add missing columns to sessions table
      const sessionColumns = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' AND table_schema = 'public'
      `);

      const existingSessionColumns = sessionColumns.rows.map(
        (row) => row.column_name
      );

      // Add consumed column if it doesn't exist
      if (!existingSessionColumns.includes("consumed")) {
        await this.pool.query(`
          ALTER TABLE sessions 
          ADD COLUMN consumed BOOLEAN DEFAULT false
        `);
        console.log("Added missing 'consumed' column to sessions table");
      }

      // Add consumed_at column if it doesn't exist
      if (!existingSessionColumns.includes("consumed_at")) {
        await this.pool.query(`
          ALTER TABLE sessions 
          ADD COLUMN consumed_at TIMESTAMP
        `);
        console.log("Added missing 'consumed_at' column to sessions table");
      }

      // Check and add missing columns to projects table
      const projectColumns = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'projects' AND table_schema = 'public'
      `);

      const existingProjectColumns = projectColumns.rows.map(
        (row) => row.column_name
      );

      // Add is_active column if it doesn't exist
      if (!existingProjectColumns.includes("is_active")) {
        await this.pool.query(`
          ALTER TABLE projects 
          ADD COLUMN is_active BOOLEAN DEFAULT true
        `);
        console.log("Added missing 'is_active' column to projects table");
      }

      // Add created_by column if it doesn't exist
      if (!existingProjectColumns.includes("created_by")) {
        await this.pool.query(`
          ALTER TABLE projects 
          ADD COLUMN created_by UUID REFERENCES admin_users(id)
        `);
        console.log("Added missing 'created_by' column to projects table");
      }

      // Add settings column if it doesn't exist
      if (!existingProjectColumns.includes("settings")) {
        await this.pool.query(`
          ALTER TABLE projects 
          ADD COLUMN settings JSONB DEFAULT '{}'::jsonb
        `);
        console.log("Added missing 'settings' column to projects table");
      }

      // Add storage_used column if it doesn't exist
      if (!existingProjectColumns.includes("storage_used")) {
        await this.pool.query(`
          ALTER TABLE projects 
          ADD COLUMN storage_used BIGINT DEFAULT 0
        `);
        console.log("Added missing 'storage_used' column to projects table");
      }

      // Add api_calls_count column if it doesn't exist
      if (!existingProjectColumns.includes("api_calls_count")) {
        await this.pool.query(`
          ALTER TABLE projects 
          ADD COLUMN api_calls_count BIGINT DEFAULT 0
        `);
        console.log("Added missing 'api_calls_count' column to projects table");
      }

      // Add last_api_call column if it doesn't exist
      if (!existingProjectColumns.includes("last_api_call")) {
        await this.pool.query(`
          ALTER TABLE projects 
          ADD COLUMN last_api_call TIMESTAMP
        `);
        console.log("Added missing 'last_api_call' column to projects table");
      }

      // Check and add missing columns to admin_users table
      const adminUserColumns = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'admin_users' AND table_schema = 'public'
      `);

      const existingAdminUserColumns = adminUserColumns.rows.map(
        (row) => row.column_name
      );

      // Add password_hash column if it doesn't exist (rename from password if needed)
      if (!existingAdminUserColumns.includes("password_hash")) {
        if (existingAdminUserColumns.includes("password")) {
          // Rename password column to password_hash
          await this.pool.query(`
            ALTER TABLE admin_users 
            RENAME COLUMN password TO password_hash
          `);
          console.log(
            "Renamed 'password' column to 'password_hash' in admin_users table"
          );
        } else {
          // Add password_hash column
          await this.pool.query(`
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
        await this.pool.query(`
          ALTER TABLE admin_users 
          ADD COLUMN api_key VARCHAR(255) UNIQUE
        `);
        console.log("Added missing 'api_key' column to admin_users table");
      }

      // Note: Removed user_type backward compatibility code - now using 'type' column directly
    } catch (error) {
      console.error("Error fixing missing columns:", error);
    }
  }

  // Admin User Management
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

    const result = await this.pool.query(
      `INSERT INTO admin_users (username, email, password_hash, role, access_level, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        data.username,
        data.email,
        hashedPassword,
        data.role,
        data.access_level,
        data.active ?? true,
      ]
    );

    return this.mapAdminUser(result.rows[0]);
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM admin_users WHERE username = $1",
      [username]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM admin_users WHERE email = $1",
      [email]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAdminUserById(id: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM admin_users WHERE id = $1",
      [id]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAdminUserByApiKey(apiKey: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM admin_users WHERE api_key = $1 AND is_active = true",
      [apiKey]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM admin_users ORDER BY created_at DESC"
    );

    return result.rows.map((row) => this.mapAdminUser(row));
  }

  async updateAdminUser(
    id: string,
    data: Partial<AdminUser>
  ): Promise<AdminUser | null> {
    await this.ensureReady();
    const fields: string[] = [];
    const values: any[] = [];
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
      values.push(data.active);
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
    const result = await this.pool.query(
      `UPDATE admin_users SET ${fields.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async updateLoginInfo(id: string): Promise<void> {
    await this.ensureReady();
    await this.pool.query(
      `UPDATE admin_users 
       SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 
       WHERE id = $1`,
      [id]
    );
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query(
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
      Project,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "storageUsed"
      | "apiCallsCount"
      | "lastApiCall"
    >
  ): Promise<Project> {
    try {
      const apiKey = data.api_key || `pk_${uuidv4().replace(/-/g, "")}`;

      const rows = await this.queryWithRetry<any>(
        `INSERT INTO projects (name, description, project_url, api_key, is_active, created_by, settings) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          data.name,
          data.description,
          data.project_url,
          apiKey,
          data.active ?? true,
          data.created_by,
          JSON.stringify(data.settings || {}),
        ]
      );

      return this.mapProject(rows[0]);
    } catch (error) {
      console.error("Failed to create project:", error);
      // Check if it's a schema issue
      if (error instanceof Error && error.message.includes("column")) {
        await this.autoRepair();
        // Retry after repair
        return this.createProject(data);
      }
      throw error;
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
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

      const rows = await this.queryWithRetry<Project>(
        `SELECT * FROM projects WHERE id = $1`,
        [sanitizedId]
      );

      return rows.length > 0
        ? this.mapProject(rows[0] as unknown as Record<string, unknown>)
        : null;
    } catch (error) {
      console.error("Failed to get project by ID:", error);
      throw error;
    }
  }

  async getProjectByApiKey(apiKey: string): Promise<Project | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM projects WHERE api_key = $1 AND is_active = true",
      [apiKey]
    );

    return result.rows.length > 0 ? this.mapProject(result.rows[0]) : null;
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const rows = await this.queryWithRetry<Record<string, unknown>>(
        `SELECT * FROM projects ORDER BY created_at DESC`
      );
      return rows.map((row) => this.mapProject(row));
    } catch (error) {
      console.error("Failed to get all projects:", error);
      // Attempt to fix the issue
      await this.autoRepair();
      // Retry once after repair
      const rows = await this.queryWithRetry<Record<string, unknown>>(
        `SELECT * FROM projects ORDER BY created_at DESC`
      );
      return rows.map((row) => this.mapProject(row));
    }
  }

  async updateProject(
    id: string,
    data: Partial<Project>
  ): Promise<Project | null> {
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
        values.push(data.active);
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

      const rows = await this.queryWithRetry<any>(
        `UPDATE projects SET ${updates.join(
          ", "
        )} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      return rows.length > 0 ? this.mapProject(rows[0]) : null;
    } catch (error) {
      console.error("Failed to update project:", error);
      throw error;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Delete related data in correct order
      await client.query(
        "DELETE FROM documents WHERE collection_id IN (SELECT id FROM collections WHERE project_id = $1)",
        [id]
      );
      await client.query("DELETE FROM collections WHERE project_id = $1", [id]);
      await client.query("DELETE FROM project_users WHERE project_id = $1", [
        id,
      ]);
      await client.query("DELETE FROM files WHERE project_id = $1", [id]);
      await client.query("DELETE FROM changelog WHERE project_id = $1", [id]);
      await client.query("DELETE FROM api_keys WHERE owner_id = $1", [id]);

      // Finally delete the project
      const result = await client.query("DELETE FROM projects WHERE id = $1", [
        id,
      ]);

      await client.query("COMMIT");
      return result.rowCount > 0;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Failed to delete project:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async regenerateProjectApiKey(id: string): Promise<string | null> {
    const apiKey = `pk_${uuidv4().replace(/-/g, "")}`;

    const result = await this.pool.query(
      "UPDATE projects SET api_key = $1 WHERE id = $2 RETURNING api_key",
      [apiKey, id]
    );

    return result.rows.length > 0 ? result.rows[0].api_key : null;
  }

  async updateProjectStats(
    projectId: string,
    storageChange: number = 0,
    apiCall: boolean = false
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
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
      await this.pool.query(
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
      phone?: string;
      scopes?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<ProjectUser> {
    await this.ensureReady();

    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const result = await this.pool.query(
      `INSERT INTO project_users (project_id, username, email, password_hash, phone, scopes, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        projectId,
        userData.username,
        userData.email,
        hashedPassword,
        userData.phone,
        userData.scopes || [],
        userData.metadata || {},
      ]
    );

    return this.mapProjectUser(result.rows[0]);
  }

  async getProjectUser(
    projectId: string,
    userId: string
  ): Promise<ProjectUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM project_users WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async getProjectUserByEmail(
    projectId: string,
    email: string
  ): Promise<ProjectUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM project_users WHERE project_id = $1 AND email = $2",
      [projectId, email]
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async getProjectUserByUsername(
    projectId: string,
    username: string
  ): Promise<ProjectUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM project_users WHERE project_id = $1 AND username = $2",
      [projectId, username]
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async getProjectUsers(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
      active?: boolean;
    }
  ): Promise<{ users: ProjectUser[]; total: number }> {
    await this.ensureReady();
    const { limit = 100, offset = 0, search, active } = options || {};

    let whereClause = "WHERE project_id = $1";
    const params: any[] = [projectId];
    let paramCount = 1;

    if (active !== undefined) {
      whereClause += ` AND is_active = $${++paramCount}`;
      params.push(active);
    }

    if (search) {
      whereClause += ` AND (username ILIKE $${++paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM project_users ${whereClause}`,
      params
    );

    // Get paginated results
    const result = await this.pool.query(
      `SELECT * FROM project_users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    return {
      users: result.rows.map((row) => this.mapProjectUser(row)),
      total: parseInt(countResult.rows[0].count),
    };
  }

  async updateProjectUser(
    projectId: string,
    userId: string,
    updates: Partial<ProjectUser>
  ): Promise<ProjectUser | null> {
    await this.ensureReady();
    const fields: string[] = [];
    const values: any[] = [];
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
    const result = await this.pool.query(
      `UPDATE project_users 
       SET ${fields.join(", ")} 
       WHERE project_id = $${paramCount} AND id = $${paramCount + 1} 
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async deleteProjectUser(projectId: string, userId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query(
      "DELETE FROM project_users WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async authenticateProjectUser(
    projectId: string,
    username: string,
    password: string
  ): Promise<ProjectUser | null> {
    await this.ensureReady();

    // Username could be either username or email
    const result = await this.pool.query(
      `SELECT * FROM project_users 
       WHERE project_id = $1 AND (username = $2 OR email = $2) AND is_active = true`,
      [projectId, username]
    );

    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) return null;

    // Update last login
    await this.pool.query(
      "UPDATE project_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    return this.mapProjectUser(user);
  }

  async getUserProjects(adminUserId: string): Promise<Project[]> {
    const result = await this.pool.query(
      `SELECT p.* 
       FROM projects p 
       JOIN project_users pu ON p.id = pu.project_id 
       WHERE pu.admin_user_id = $1 
       ORDER BY p.created_at DESC`,
      [adminUserId]
    );

    return result.rows.map((row) => this.mapProject(row));
  }

  async removeProjectUser(
    projectId: string,
    adminUserId: string
  ): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM project_users WHERE project_id = $1 AND admin_user_id = $2",
      [projectId, adminUserId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async checkProjectAccess(
    projectId: string,
    adminUserId: string
  ): Promise<boolean> {
    const result = await this.pool.query(
      "SELECT id FROM project_users WHERE project_id = $1 AND admin_user_id = $2",
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
    const result = await this.pool.query(
      `INSERT INTO collections (project_id, name, description, fields, indexes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        projectId,
        collectionName,
        schema.description,
        JSON.stringify(schema.fields),
        JSON.stringify(schema.indexes),
        createdBy,
      ]
    );

    return this.mapCollection(result.rows[0]);
  }

  async getCollection(
    projectId: string,
    collectionName: string
  ): Promise<Collection | null> {
    const result = await this.pool.query(
      "SELECT * FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
  }

  async getProjectCollections(projectId: string): Promise<Collection[]> {
    const result = await this.pool.query(
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
    const result = await this.pool.query(
      `UPDATE collections 
       SET description = $1, fields = $2, indexes = $3 
       WHERE project_id = $4 AND name = $5 
       RETURNING *`,
      [
        schema.description,
        JSON.stringify(schema.fields),
        JSON.stringify(schema.indexes),
        projectId,
        collectionName,
      ]
    );

    return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
  }

  async deleteCollection(
    projectId: string,
    collectionName: string
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Delete all documents for this collection
      await client.query(
        "DELETE FROM documents WHERE project_id = $1 AND collection_name = $2",
        [projectId, collectionName]
      );

      // Delete the collection schema
      const result = await client.query(
        "DELETE FROM collections WHERE project_id = $1 AND name = $2",
        [projectId, collectionName]
      );

      await client.query("COMMIT");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getDocumentsByCollection(
    collectionId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ documents: Document[]; total: number }> {
    // First get the collection to get project_id and collection_name
    const collectionResult = await this.pool.query(
      "SELECT project_id, name FROM collections WHERE id = $1",
      [collectionId]
    );

    if (collectionResult.rows.length === 0) {
      return { documents: [], total: 0 };
    }

    const { project_id, name } = collectionResult.rows[0];
    return this.getDocuments(project_id, name, options);
  }

  // Table Schema Methods (keeping for backward compatibility)
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
    const result = await this.pool.query(
      `INSERT INTO collections (project_id, name, description, fields, indexes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        projectId,
        tableName,
        schema.description,
        JSON.stringify(schema.fields),
        JSON.stringify(schema.indexes),
        createdBy,
      ]
    );

    return this.mapCollection(result.rows[0]);
  }

  async getTableSchema(
    projectId: string,
    tableName: string
  ): Promise<Collection | null> {
    const result = await this.pool.query(
      "SELECT * FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, tableName]
    );

    return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
  }

  async getProjectTableSchemas(projectId: string): Promise<Collection[]> {
    const result = await this.pool.query(
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
    const result = await this.pool.query(
      `UPDATE collections 
       SET description = $1, fields = $2, indexes = $3 
       WHERE project_id = $4 AND name = $5 
       RETURNING *`,
      [
        schema.description,
        JSON.stringify(schema.fields),
        JSON.stringify(schema.indexes),
        projectId,
        tableName,
      ]
    );

    return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
  }

  async deleteTableSchema(
    projectId: string,
    tableName: string
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Delete all documents for this table
      await client.query(
        "DELETE FROM documents WHERE project_id = $1 AND collection_name = $2",
        [projectId, tableName]
      );

      // Delete the schema
      const result = await client.query(
        "DELETE FROM collections WHERE project_id = $1 AND name = $2",
        [projectId, tableName]
      );

      await client.query("COMMIT");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
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

    // First, get the collection_id using project_id and collection_name
    const collectionResult = await this.pool.query(
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      throw new Error(
        `Collection '${collectionName}' not found in project '${projectId}'`
      );
    }

    const collectionId = collectionResult.rows[0].id;

    // Now insert the document with the collection_id
    const result = await this.pool.query(
      `INSERT INTO documents (project_id, collection_id, collection_name, data, created_by, updated_by) 
       VALUES ($1, $2, $3, $4, $5, $5) 
       RETURNING *`,
      [projectId, collectionId, collectionName, data, createdBy]
    );

    return this.mapDocument(result.rows[0]);
  }

  async getDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<Document | null> {
    const result = await this.pool.query(
      "SELECT * FROM documents WHERE id = $1 AND project_id = $2 AND collection_name = $3",
      [documentId, projectId, collectionName]
    );

    return result.rows.length > 0 ? this.mapDocument(result.rows[0]) : null;
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

    let whereClause = "WHERE project_id = $1 AND collection_name = $2";
    const params: unknown[] = [projectId, collectionName];

    if (where && Object.keys(where).length > 0) {
      Object.entries(where).forEach(([key, value], _index) => {
        whereClause += ` AND data->>'${key}' = $${params.length + 1}`;
        params.push(value);
      });
    }

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM documents ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get documents
    const result = await this.pool.query(
      `SELECT * FROM documents ${whereClause} 
       ORDER BY ${orderBy} ${order.toUpperCase()} 
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
    const result = await this.pool.query(
      `UPDATE documents 
       SET data = $1, updated_by = $2 
       WHERE id = $3 AND project_id = $4 AND collection_name = $5 
       RETURNING *`,
      [data, updatedBy, documentId, projectId, collectionName]
    );

    return result.rows.length > 0 ? this.mapDocument(result.rows[0]) : null;
  }

  async deleteDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM documents WHERE id = $1 AND project_id = $2 AND collection_name = $3",
      [documentId, projectId, collectionName]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getDocumentsByTable(
    tableId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ documents: Document[]; total: number }> {
    // First get the table schema to get project_id and table_name
    const tableResult = await this.pool.query(
      "SELECT project_id, name FROM collections WHERE id = $1",
      [tableId]
    );

    if (tableResult.rows.length === 0) {
      return { documents: [], total: 0 };
    }

    const { project_id, name } = tableResult.rows[0];
    return this.getDocuments(project_id, name, options);
  }

  // File Methods
  async createFile(
    data: Omit<FileRecord, "id" | "createdAt">
  ): Promise<FileRecord> {
    const result = await this.pool.query(
      `INSERT INTO files (project_id, filename, original_name, mime_type, size, path, metadata, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        data.project_id,
        data.filename,
        data.original_name,
        data.mime_type,
        data.size,
        data.path,
        {},
        data.uploaded_by,
      ]
    );

    await this.updateProjectStats(data.project_id, data.size);
    return this.mapFile(result.rows[0]);
  }

  async getFile(fileId: string): Promise<FileRecord | null> {
    const result = await this.pool.query("SELECT * FROM files WHERE id = $1", [
      fileId,
    ]);

    return result.rows.length > 0 ? this.mapFile(result.rows[0]) : null;
  }

  async getProjectFiles(projectId: string): Promise<FileRecord[]> {
    const result = await this.pool.query(
      "SELECT * FROM files WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );

    return result.rows.map((row) => this.mapFile(row));
  }

  async deleteFile(fileId: string): Promise<FileRecord | null> {
    const result = await this.pool.query(
      "DELETE FROM files WHERE id = $1 RETURNING *",
      [fileId]
    );

    if (result.rows.length > 0) {
      const file = this.mapFile(result.rows[0]);
      await this.updateProjectStats(file.project_id, -file.size);
      return file;
    }

    return null;
  }

  // Session Methods
  async createSession(
    data: Omit<Session, "id" | "createdAt" | "lastActivity">
  ): Promise<Session> {
    const result = await this.pool.query(
      `INSERT INTO sessions (token, user_id, project_id, type, scopes, metadata, expires_at, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        data.token,
        data.user_id,
        data.project_id,
        data.type,
        data.scopes || [],
        data.metadata || {},
        data.expires_at,
        !data.consumed,
      ]
    );

    return this.mapSession(result.rows[0]);
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    const result = await this.pool.query(
      "SELECT * FROM sessions WHERE token = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP",
      [token]
    );

    if (result.rows.length > 0) {
      // Update last activity
      await this.pool.query(
        "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1",
        [result.rows[0].id]
      );
      return this.mapSession(result.rows[0]);
    }

    return null;
  }

  async invalidateSession(token: string): Promise<boolean> {
    const result = await this.pool.query(
      "UPDATE sessions SET is_active = false WHERE token = $1",
      [token]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async consumeSession(token: string): Promise<Session | null> {
    const result = await this.pool.query(
      `UPDATE sessions 
       SET consumed = true, consumed_at = CURRENT_TIMESTAMP 
       WHERE token = $1 AND consumed = false 
       RETURNING *`,
      [token]
    );

    return result.rows.length > 0 ? this.mapSession(result.rows[0]) : null;
  }

  async updateSession(
    token: string,
    updates: { consumed?: boolean; last_activity?: boolean }
  ): Promise<Session | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.consumed !== undefined) {
      setClauses.push(`consumed = $${paramCount++}`);
      values.push(updates.consumed);
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
    const result = await this.pool.query(
      `UPDATE sessions 
       SET ${setClauses.join(", ")} 
       WHERE token = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapSession(result.rows[0]) : null;
  }

  async getSessionById(sessionId: string): Promise<Session | null> {
    const result = await this.pool.query(
      "SELECT * FROM sessions WHERE id = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP",
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
      access_level: "full" as any,
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
      ] as AdminPermission[],
      active: true,
    };

    await this.createAdminUser({
      ...defaultAdmin,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = require("bcryptjs");
    return await bcrypt.hash(password, 12);
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    await this.pool.query(
      "UPDATE sessions SET is_active = false WHERE user_id = $1",
      [userId]
    );
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.pool.query(
      "DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP OR is_active = false"
    );

    return result.rowCount ?? 0;
  }

  // Changelog Methods
  async createChangelogEntry(
    data: Omit<ChangelogEntry, "id" | "created_at">
  ): Promise<ChangelogEntry> {
    const result = await this.pool.query(
      `INSERT INTO changelog (project_id, entity_type, entity_id, action, changes, performed_by, session_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        data.project_id,
        data.entity_type,
        data.entity_id,
        data.action,
        data.changes || {},
        data.performed_by,
        data.session_id,
        new Date().toISOString(),
      ]
    );

    return this.mapChangelogEntry(result.rows[0]);
  }

  async getProjectChangelog(
    projectId: string,
    limit: number = 100
  ): Promise<ChangelogEntry[]> {
    const result = await this.pool.query(
      `SELECT c.*, au.username 
       FROM changelog c 
       LEFT JOIN admin_users au ON c.performed_by = au.id 
       WHERE c.project_id = $1 
       ORDER BY c.created_at DESC 
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
  }): Promise<ChangelogEntry[]> {
    const { project_id, entity_type, entity_id, limit = 100 } = filters;
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

    values.push(limit);

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await this.pool.query(
      `SELECT c.*, au.username 
       FROM changelog c 
       LEFT JOIN admin_users au ON c.performed_by = au.id 
       ${whereClause}
       ORDER BY c.created_at DESC 
       LIMIT $${values.length}`,
      values
    );

    return result.rows.map((row) => this.mapChangelogEntry(row));
  }

  // API Key Methods
  async createApiKey(data: {
    name: string;
    type: "master" | "admin" | "project";
    owner_id: string;
    scopes: string[];
    project_ids?: string[];
    expires_at?: string;
  }): Promise<ApiKey> {
    await this.ensureReady();
    const key =
      data.type === "master"
        ? `mak_${uuidv4().replace(/-/g, "")}`
        : data.type === "admin"
        ? `ak_${uuidv4().replace(/-/g, "")}`
        : `pk_${uuidv4().replace(/-/g, "")}`;

    const result = await this.pool.query(
      `INSERT INTO api_keys (key, name, type, owner_id, scopes, project_ids, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        key,
        data.name,
        data.type,
        data.owner_id,
        data.scopes,
        data.project_ids,
        data.expires_at,
      ]
    );

    return this.mapApiKey(result.rows[0]);
  }

  async getApiKey(key: string): Promise<ApiKey | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM api_keys WHERE key = $1 AND is_active = true",
      [key]
    );

    if (result.rows.length === 0) return null;

    // Update last_used_at
    await this.pool.query(
      "UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key = $1",
      [key]
    );

    return this.mapApiKey(result.rows[0]);
  }

  async getApiKeysByOwner(ownerId: string): Promise<ApiKey[]> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM api_keys WHERE owner_id = $1 ORDER BY created_at DESC",
      [ownerId]
    );

    return result.rows.map((row) => this.mapApiKey(row));
  }

  async updateApiKey(
    id: string,
    data: Partial<ApiKey>
  ): Promise<ApiKey | null> {
    await this.ensureReady();
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.scopes !== undefined) {
      fields.push(`scopes = $${paramCount++}`);
      values.push(data.scopes);
    }
    if (data.project_ids !== undefined) {
      fields.push(`project_ids = $${paramCount++}`);
      values.push(data.project_ids);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }
    if (data.expires_at !== undefined) {
      fields.push(`expires_at = $${paramCount++}`);
      values.push(data.expires_at);
    }

    if (fields.length === 0) return this.getApiKeyById(id);

    values.push(id);
    const result = await this.pool.query(
      `UPDATE api_keys SET ${fields.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapApiKey(result.rows[0]) : null;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query(
      "UPDATE api_keys SET is_active = false WHERE id = $1",
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getApiKeyById(id: string): Promise<ApiKey | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM api_keys WHERE id = $1",
      [id]
    );

    return result.rows.length > 0 ? this.mapApiKey(result.rows[0]) : null;
  }

  // Create project API key
  async createProjectApiKey(apiKey: {
    project_id: string;
    name: string;
    key: string;
    scopes: Scope[];
    created_by: string;
    created_at: string;
    last_used_at: string | null;
    active: boolean;
  }): Promise<ApiKey> {
    await this.ensureReady();

    const query = `
      INSERT INTO api_keys (
        id, key, name, type, owner_id, scopes, 
        created_at, last_used_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      uuidv4(),
      apiKey.key,
      apiKey.name,
      "project",
      apiKey.project_id,
      apiKey.scopes,
      apiKey.created_at,
      apiKey.last_used_at,
      apiKey.active,
    ];

    const result = await this.pool.query(query, values);
    return this.mapApiKey(result.rows[0]);
  }

  // Get project API keys
  async getProjectApiKeys(projectId: string): Promise<ApiKey[]> {
    await this.ensureReady();

    const query = `
      SELECT * FROM api_keys 
      WHERE owner_id = $1 AND type = 'project' AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [projectId]);
    return result.rows.map((row) => this.mapApiKey(row));
  }

  // Get project API key by ID
  async getProjectApiKeyById(keyId: string): Promise<ApiKey | null> {
    await this.ensureReady();

    const query = `
      SELECT * FROM api_keys 
      WHERE id = $1 AND type = 'project'
    `;

    const result = await this.pool.query(query, [keyId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapApiKey(result.rows[0]);
  }

  // Delete project API key
  async deleteProjectApiKey(keyId: string): Promise<boolean> {
    await this.ensureReady();

    const query = `
      UPDATE api_keys 
      SET is_active = false 
      WHERE id = $1 AND type = 'project'
      RETURNING id
    `;

    const result = await this.pool.query(query, [keyId]);
    return result.rows.length > 0;
  }

  // Get user API keys
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    await this.ensureReady();

    const query = `
      SELECT * FROM api_keys 
      WHERE owner_id = $1 AND type = 'admin' AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows.map((row) => this.mapApiKey(row));
  }

  // Create user API key
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
  }): Promise<ApiKey> {
    await this.ensureReady();

    const query = `
      INSERT INTO api_keys (
        id, key, name, type, owner_id, scopes, project_ids,
        created_at, last_used_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      uuidv4(),
      apiKey.key,
      apiKey.name,
      apiKey.type,
      apiKey.user_id,
      apiKey.scopes,
      apiKey.project_ids,
      apiKey.created_at,
      apiKey.last_used_at,
      apiKey.active,
    ];

    const result = await this.pool.query(query, values);
    return this.mapApiKey(result.rows[0]);
  }

  // Email Configuration Methods
  async getEmailConfig(projectId: string): Promise<any> {
    await this.ensureReady();
    const query = `
      SELECT settings->>'email_config' as email_config FROM projects 
      WHERE id = $1
    `;
    const result = await this.queryWithRetry(query, [projectId]);
    const emailConfig = result[0]?.email_config;
    return emailConfig ? JSON.parse(emailConfig) : null;
  }

  async updateEmailConfig(projectId: string, config: any): Promise<any> {
    await this.ensureReady();
    const query = `
      UPDATE projects 
      SET settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb), 
        '{email_config}', 
        $2::jsonb
      ), updated_at = NOW()
      WHERE id = $1
      RETURNING settings->>'email_config' as email_config
    `;
    const result = await this.queryWithRetry(query, [
      projectId,
      JSON.stringify(config),
    ]);
    const emailConfig = result[0]?.email_config;
    return emailConfig ? JSON.parse(emailConfig) : null;
  }

  async testEmailConfig(
    projectId: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    // This would integrate with an email service like nodemailer
    // For now, return a mock response
    return {
      success: true,
      message: `Test email would be sent to ${email}`,
    };
  }

  // Email Template Methods
  async getEmailTemplates(projectId: string): Promise<any[]> {
    await this.ensureReady();
    const query = `
      SELECT * FROM email_templates 
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.queryWithRetry(query, [projectId]);
    return result;
  }

  async getEmailTemplate(projectId: string, templateId: string): Promise<any> {
    await this.ensureReady();
    const query = `
      SELECT * FROM email_templates 
      WHERE project_id = $1 AND id = $2
    `;
    const result = await this.queryWithRetry(query, [projectId, templateId]);
    return result[0] || null;
  }

  async createEmailTemplate(
    projectId: string,
    templateData: any
  ): Promise<any> {
    await this.ensureReady();
    const { name, subject, body, variables } = templateData;
    const query = `
      INSERT INTO email_templates (project_id, name, subject, body, variables, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    const result = await this.queryWithRetry(query, [
      projectId,
      name,
      subject,
      body,
      JSON.stringify(variables || []),
    ]);
    return result[0];
  }

  async updateEmailTemplate(
    projectId: string,
    templateId: string,
    templateData: any
  ): Promise<any> {
    await this.ensureReady();
    const { name, subject, body, variables } = templateData;
    const query = `
      UPDATE email_templates 
      SET name = $3, subject = $4, body = $5, variables = $6, updated_at = NOW()
      WHERE project_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await this.queryWithRetry(query, [
      projectId,
      templateId,
      name,
      subject,
      body,
      JSON.stringify(variables || []),
    ]);
    return result[0] || null;
  }

  async deleteEmailTemplate(
    projectId: string,
    templateId: string
  ): Promise<boolean> {
    await this.ensureReady();
    const query = `
      DELETE FROM email_templates 
      WHERE project_id = $1 AND id = $2
    `;
    const result = await this.queryWithRetry(query, [projectId, templateId]);
    return result.length > 0;
  }

  async sendEmail(
    projectId: string,
    emailData: any
  ): Promise<{ success: boolean; message: string }> {
    // This would integrate with an email service like nodemailer
    // For now, return a mock response
    return {
      success: true,
      message: `Email would be sent to ${emailData.to}`,
    };
  }

  // Additional API Key Methods
  async getProjectApiKey(
    projectId: string,
    keyId: string
  ): Promise<ApiKey | null> {
    await this.ensureReady();
    const query = `
      SELECT * FROM api_keys 
      WHERE project_id = $1 AND id = $2
    `;
    const result = await this.queryWithRetry(query, [projectId, keyId]);
    return result[0] ? this.mapApiKey(result[0]) : null;
  }

  async updateProjectApiKey(
    projectId: string,
    keyId: string,
    updates: Partial<ApiKey>
  ): Promise<ApiKey | null> {
    await this.ensureReady();
    const { name, scopes, expires_at, is_active } = updates;
    const query = `
      UPDATE api_keys 
      SET name = $3, scopes = $4, expires_at = $5, is_active = $6, updated_at = NOW()
      WHERE project_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await this.queryWithRetry(query, [
      projectId,
      keyId,
      name,
      JSON.stringify(scopes || []),
      expires_at,
      is_active,
    ]);
    return result[0] ? this.mapApiKey(result[0]) : null;
  }

  async regenerateApiKey(
    projectId: string,
    keyId: string
  ): Promise<ApiKey | null> {
    await this.ensureReady();
    const newKey = `krapi_${uuidv4().replace(/-/g, "")}`;
    const query = `
      UPDATE api_keys 
      SET key = $3, updated_at = NOW()
      WHERE project_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await this.queryWithRetry(query, [projectId, keyId, newKey]);
    return result[0] ? this.mapApiKey(result[0]) : null;
  }

  // Get active sessions
  async getActiveSessions(): Promise<Session[]> {
    await this.ensureReady();

    const query = `
      SELECT * FROM sessions 
      WHERE expires_at > NOW() AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map((row) => this.mapSession(row));
  }

  // Get activity logs
  async getActivityLogs(options: {
    limit: number;
    offset: number;
    filters?: {
      entity_type?: string;
      action?: string;
      performed_by?: string;
    };
  }): Promise<ChangelogEntry[]> {
    await this.ensureReady();

    let query = `SELECT * FROM changelog WHERE 1=1`;
    const values: any[] = [];
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

    query += ` ORDER BY created_at DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(options.limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(options.offset);

    const result = await this.pool.query(query, values);
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
      permissions: (row.permissions as AdminPermission[]) || [],
      active: row.is_active as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      last_login: row.last_login as string | undefined,
      api_key: row.api_key as string | undefined,
      login_count: (row.login_count as number) || 0,
    };
  }

  private mapProject(row: Record<string, unknown>): Project {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      project_url: row.project_url as string | null,
      api_key: row.api_key as string,
      settings: row.settings as ProjectSettings,
      created_by: row.created_by as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      active: row.is_active as boolean,
    };
  }

  private mapProjectUser(row: Record<string, unknown>): ProjectUser {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      username: row.username as string,
      email: row.email as string,
      phone: row.phone as string | undefined,
      is_verified: row.is_verified as boolean,
      is_active: row.is_active as boolean,
      scopes: (row.scopes as string[]) || [],
      metadata: (row.metadata as Record<string, any>) || {},
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      last_login: row.last_login as string | undefined,
      email_verified_at: row.email_verified_at as string | undefined,
      phone_verified_at: row.phone_verified_at as string | undefined,
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
    };
  }

  private mapDocument(row: Record<string, unknown>): Document {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      collection_id: row.collection_id as string,
      data: row.data as Record<string, unknown>,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      created_by: row.created_by as string | undefined,
      updated_by: row.updated_by as string | undefined,
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
    };
  }

  private mapSession(row: Record<string, unknown>): Session {
    return {
      id: row.id as string,
      token: row.token as string,
      type: row.type as SessionType,
      user_id: row.user_id as string | undefined,
      project_id: row.project_id as string | undefined,
      scopes: (row.scopes as Scope[]) || [],
      metadata: (row.metadata as Record<string, unknown>) || {},
      expires_at: row.expires_at as string,
      created_at: row.created_at as string,
      last_activity: row.last_activity as string | undefined,
      consumed: !(row.is_active as boolean),
    };
  }

  private mapChangelogEntry(row: Record<string, unknown>): ChangelogEntry {
    return {
      id: row.id as string,
      project_id: row.project_id as string | undefined,
      entity_type: row.entity_type as string,
      entity_id: row.entity_id as string,
      action: row.action as ChangeAction,
      changes: (row.changes as Record<string, unknown>) || {},
      performed_by: row.performed_by as string,
      session_id: row.session_id as string | undefined,
      created_at: row.created_at as string,
    };
  }

  private mapApiKey(row: Record<string, unknown>): ApiKey {
    return {
      id: row.id as string,
      key: row.key as string,
      name: row.name as string,
      type: row.type as "master" | "admin" | "project",
      owner_id: row.owner_id as string,
      scopes: (row.scopes as Scope[]) || [],
      project_ids: (row.project_ids as string[]) || null,
      metadata: (row.metadata as Record<string, unknown>) || {},
      expires_at: row.expires_at as string | undefined,
      last_used_at: row.last_used_at as string | undefined,
      created_at: row.created_at as string,
      is_active: row.is_active as boolean,
    };
  }

  // Close connection pool
  async close(): Promise<void> {
    await this.pool.end();
  }

  // Enhanced query method with retry logic
  private async queryWithRetry<T = any>(
    queryText: string,
    values?: any[],
    retries: number = 3
  ): Promise<T[]> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        await this.ensureReady();
        const result = await this.pool.query(queryText, values);
        return result.rows;
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

    // Get document count
    const docResult = await this.pool.query(
      "SELECT COUNT(*) FROM documents WHERE project_id = $1",
      [projectId]
    );
    const totalDocuments = parseInt(docResult.rows[0].count);

    // Get collection count
    const colResult = await this.pool.query(
      "SELECT COUNT(*) FROM collections WHERE project_id = $1",
      [projectId]
    );
    const totalCollections = parseInt(colResult.rows[0].count);

    // Get file count
    const fileResult = await this.pool.query(
      "SELECT COUNT(*) FROM files WHERE project_id = $1",
      [projectId]
    );
    const totalFiles = parseInt(fileResult.rows[0].count);

    // Get user count
    const userResult = await this.pool.query(
      "SELECT COUNT(*) FROM project_users WHERE project_id = $1",
      [projectId]
    );
    const totalUsers = parseInt(userResult.rows[0].count);

    // Get project info
    const projectResult = await this.pool.query(
      "SELECT storage_used, api_calls_count, last_api_call FROM projects WHERE id = $1",
      [projectId]
    );
    const project = projectResult.rows[0];

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
  ): Promise<{ activities: ChangelogEntry[]; total: number }> {
    await this.ensureReady();
    const { limit = 50, offset = 0, entityType, action } = options;

    let whereClause = "WHERE project_id = $1";
    const params: any[] = [projectId];
    let paramCount = 1;

    if (entityType) {
      whereClause += ` AND entity_type = $${++paramCount}`;
      params.push(entityType);
    }

    if (action) {
      whereClause += ` AND action = $${++paramCount}`;
      params.push(action);
    }

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM changelog ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get activities
    const activitiesResult = await this.pool.query(
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
    emailConfig: any;
    storageConfig: any;
    apiConfig: any;
    generalConfig: any;
  }> {
    await this.ensureReady();

    // Get project
    const project = await this.getProjectById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Return default settings for now
    // TODO: Implement actual settings storage
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

    // Get total files and size
    const filesResult = await this.pool.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files WHERE project_id = $1",
      [projectId]
    );

    const totalFiles = parseInt(filesResult.rows[0].count);
    const totalSize = parseInt(filesResult.rows[0].total_size);

    // Get file type distribution
    const typesResult = await this.pool.query(
      "SELECT mime_type, COUNT(*) as count FROM files WHERE project_id = $1 GROUP BY mime_type",
      [projectId]
    );

    const fileTypes: Record<string, number> = {};
    typesResult.rows.forEach((row) => {
      fileTypes[row.mime_type] = parseInt(row.count);
    });

    // Get last upload
    const lastUploadResult = await this.pool.query(
      "SELECT created_at FROM files WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1",
      [projectId]
    );

    const lastUpload =
      lastUploadResult.rows.length > 0
        ? new Date(lastUploadResult.rows[0].created_at)
        : null;

    return {
      totalFiles,
      totalSize,
      fileTypes,
      lastUpload,
    };
  }
}
