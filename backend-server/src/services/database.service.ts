import * as crypto from "crypto";

import { ApiKeyScope, FieldType } from "@krapi/sdk";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

import { MigrationService } from "./migration.service";

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
  private pool: Pool;
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

  // Public method to get a database connection
  async getConnection() {
    return this.pool.connect();
  }

  // Public method to execute queries
  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    const result = await this.pool.query(sql, params);
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
    };
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
          name VARCHAR(255),
          type VARCHAR(50) DEFAULT 'admin',
          owner_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
          scopes TEXT[] DEFAULT '{}',
          project_ids UUID[] DEFAULT '{}',
          expires_at TIMESTAMP,
          rate_limit INTEGER,
          metadata JSONB DEFAULT '{}'::jsonb,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_used_at TIMESTAMP,
          usage_count BIGINT DEFAULT 0
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
          owner_id UUID NOT NULL REFERENCES admin_users(id),
          api_key VARCHAR(255) UNIQUE NOT NULL,
          allowed_origins TEXT[] DEFAULT '{}',
          settings JSONB DEFAULT '{}'::jsonb,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
          collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID NOT NULL REFERENCES admin_users(id)
        )
      `);

      // Create indexes for documents
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
          consumed BOOLEAN DEFAULT false,
          consumed_at TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

      // Add missing essential tables for auth system
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
                  consumed BOOLEAN DEFAULT false,
        consumed_at TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

      await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        type VARCHAR(50) DEFAULT 'admin',
        owner_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        scopes TEXT[] DEFAULT '{}',
        project_ids UUID[] DEFAULT '{}',
        expires_at TIMESTAMP,
        rate_limit INTEGER,
        metadata JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP,
        usage_count BIGINT DEFAULT 0
      )
    `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS changelog (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES admin_users(id),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id UUID,
          changes JSONB,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address INET,
          user_agent TEXT
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

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
        const pgError = error as Error & { code: string };

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
        const hashedPassword = await this.hashPassword("admin123");
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
      } else {
        adminId = result.rows[0].id;

        // Ensure default admin has correct password and generate API key if missing
        const defaultPassword =
          process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
        const hashedPassword = await this.hashPassword(defaultPassword);

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
      `INSERT INTO admin_users (username, email, password_hash, role, access_level, permissions, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        data.username,
        data.email,
        hashedPassword,
        data.role,
        data.access_level,
        JSON.stringify(data.permissions || []),
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

  async updateAdminUserPassword(
    id: string,
    passwordHash: string
  ): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "UPDATE admin_users SET password_hash = $1 WHERE id = $2 RETURNING *",
      [passwordHash, id]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async updateAdminUserApiKey(
    id: string,
    apiKey: string
  ): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "UPDATE admin_users SET api_key = $1 WHERE id = $2 RETURNING *",
      [apiKey, id]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
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

  // Admin account management methods
  async enableAdminAccount(adminUserId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query(
      "UPDATE admin_users SET is_active = true WHERE id = $1",
      [adminUserId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async disableAdminAccount(adminUserId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query(
      "UPDATE admin_users SET is_active = false WHERE id = $1",
      [adminUserId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getAdminAccountStatus(
    adminUserId: string
  ): Promise<{ is_active: boolean } | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT is_active FROM admin_users WHERE id = $1",
      [adminUserId]
    );
    return result.rows.length > 0
      ? (result.rows[0] as { is_active: boolean })
      : null;
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
      const apiKey = data.api_key || `pk_${uuidv4().replace(/-/g, "")}`;

      const rows = await this.queryWithRetry<Record<string, unknown>>(
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

      const rows = await this.queryWithRetry<BackendProject>(
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

  async getProjectByApiKey(apiKey: string): Promise<BackendProject | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM projects WHERE api_key = $1 AND is_active = true",
      [apiKey]
    );

    return result.rows.length > 0 ? this.mapProject(result.rows[0]) : null;
  }

  async getAllProjects(): Promise<BackendProject[]> {
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

      const rows = await this.queryWithRetry<Record<string, unknown>>(
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
      role?: string;
      phone?: string;
      is_verified?: boolean;
      scopes?: string[];
    }
  ): Promise<BackendProjectUser> {
    await this.ensureReady();

    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const result = await this.pool.query(
      `INSERT INTO project_users (project_id, username, email, password_hash, phone, scopes, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        projectId,
        userData.username,
        userData.email,
        hashedPassword,
        userData.phone,
        userData.scopes || [],
        userData.is_verified || false,
      ]
    );

    return this.mapProjectUser(result.rows[0]);
  }

  async getProjectUser(
    projectId: string,
    userId: string
  ): Promise<BackendProjectUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM project_users WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async getProjectUserById(userId: string): Promise<BackendProjectUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM project_users WHERE id = $1",
      [userId]
    );

    return result.rows.length > 0 ? this.mapProjectUser(result.rows[0]) : null;
  }

  async getProjectUserByEmail(
    projectId: string,
    email: string
  ): Promise<BackendProjectUser | null> {
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
  ): Promise<BackendProjectUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT * FROM project_users WHERE project_id = $1 AND username = $2",
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

  // Project user account management methods
  async enableProjectUser(projectId: string, userId: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query(
      "UPDATE project_users SET is_active = true WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async disableProjectUser(
    projectId: string,
    userId: string
  ): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query(
      "UPDATE project_users SET is_active = false WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getProjectUserStatus(
    projectId: string,
    userId: string
  ): Promise<{ is_active: boolean } | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      "SELECT is_active FROM project_users WHERE project_id = $1 AND id = $2",
      [projectId, userId]
    );
    return result.rows.length > 0
      ? (result.rows[0] as { is_active: boolean })
      : null;
  }

  async authenticateProjectUser(
    projectId: string,
    username: string,
    password: string
  ): Promise<BackendProjectUser | null> {
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

  async getUserProjects(adminUserId: string): Promise<BackendProject[]> {
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
    try {
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
    const result = await this.pool.query(
      "SELECT * FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    return result.rows.length > 0 ? this.mapCollection(result.rows[0]) : null;
  }

  async getCollectionById(collectionId: string): Promise<Collection | null> {
    const result = await this.pool.query(
      "SELECT * FROM collections WHERE id = $1",
      [collectionId]
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

      // Delete the collection
      const result = await client.query(
        "DELETE FROM collections WHERE project_id = $1 AND name = $2",
        [projectId, collectionName]
      );

      await client.query("COMMIT");
      return result.rowCount > 0;
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
      `INSERT INTO documents (collection_id, data, created_by) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [collectionId, data, createdBy]
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

  async getDocumentById(documentId: string): Promise<Document | null> {
    const result = await this.pool.query(
      "SELECT * FROM documents WHERE id = $1",
      [documentId]
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
        orderClause = `ORDER BY CAST(data->>'${orderBy}' AS NUMERIC) ${order.toUpperCase()}`;
      } else {
        orderClause = `ORDER BY data->>'${orderBy}' ${order.toUpperCase()}`;
      }
    }

    const result = await this.pool.query(
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

    let query = `SELECT * FROM documents WHERE project_id = $1 AND collection_name = $2`;
    const params: unknown[] = [projectId, collectionName];

    if (searchTerm) {
      if (searchFields && searchFields.length > 0) {
        // Search in specific fields
        const fieldConditions = searchFields.map((field) => {
          params.push(`%${searchTerm}%`);
          return `data->>'${field}' ILIKE $${params.length}`;
        });
        query += ` AND (${fieldConditions.join(" OR ")})`;
      } else {
        // Search in all data
        params.push(`%${searchTerm}%`);
        query += ` AND data::text ILIKE $${params.length}`;
      }
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows.map((row) => this.mapDocument(row));
  }

  async countDocuments(
    projectId: string,
    collectionName: string
  ): Promise<number> {
    await this.ensureReady();

    const result = await this.pool.query(
      "SELECT COUNT(*) FROM documents WHERE project_id = $1 AND collection_name = $2",
      [projectId, collectionName]
    );

    return parseInt(result.rows[0].count);
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
    data: Omit<BackendSession, "id" | "createdAt" | "lastActivity">
  ): Promise<BackendSession> {
    const result = await this.pool.query(
      `INSERT INTO sessions (token, user_id, project_id, type, scopes, metadata, created_at, expires_at, consumed, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        data.token,
        data.user_id,
        data.project_id,
        data.type,
        data.scopes || [],
        data.metadata || {},
        data.created_at,
        data.expires_at,
        data.consumed || false,
        true, // is_active
      ]
    );

    return this.mapSession(result.rows[0]);
  }

  async getSessionByToken(token: string): Promise<BackendSession | null> {
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

  async consumeSession(token: string): Promise<BackendSession | null> {
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
  ): Promise<BackendSession | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
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

  async getSessionById(sessionId: string): Promise<BackendSession | null> {
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
    data: CreateBackendChangelogEntry
  ): Promise<BackendChangelogEntry> {
    const result = await this.pool.query(
      `INSERT INTO changelog (project_id, entity_type, entity_id, action, changes, performed_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        data.project_id,
        data.entity_type,
        data.entity_id,
        data.action,
        data.changes || {},
        data.performed_by,
        new Date().toISOString(),
      ]
    );

    return this.mapChangelogEntry(result.rows[0]);
  }

  async getProjectChangelog(
    projectId: string,
    limit = 100
  ): Promise<BackendChangelogEntry[]> {
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

    const result = await this.pool.query(
      `SELECT c.*, au.username 
       FROM changelog c 
       LEFT JOIN admin_users au ON c.performed_by = au.id 
       ${whereClause}
       ORDER BY c.created_at DESC 
       LIMIT $${values.length} OFFSET $${values.length + 1}`,
      [...values, offset]
    );

    return result.rows.map((row) => this.mapChangelogEntry(row));
  }

  // API Key Methods
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

    const result = await this.pool.query(
      `INSERT INTO api_keys (key, name, scopes, project_id, user_id, expires_at, rate_limit, metadata, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        key,
        data.name,
        JSON.stringify(data.scopes),
        data.project_id,
        data.user_id,
        data.expires_at,
        data.rate_limit,
        JSON.stringify(data.metadata || {}),
        "active",
      ]
    );

    return this.mapApiKey(result.rows[0]);
  }

  async getApiKey(key: string): Promise<BackendApiKey | null> {
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

  async getApiKeysByOwner(ownerId: string): Promise<BackendApiKey[]> {
    await this.ensureReady();
    const result = await this.pool.query(
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
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.scopes !== undefined) {
      fields.push(`scopes = $${paramCount++}`);
      values.push(data.scopes);
    }
    if (data.project_id !== undefined) {
      fields.push(`project_id = $${paramCount++}`);
      values.push(data.project_id);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
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

  async getApiKeyById(id: string): Promise<BackendApiKey | null> {
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
    scopes: ApiKeyScope[];
    user_id: string;
    expires_at?: string;
    rate_limit?: number;
    metadata?: Record<string, unknown>;
  }): Promise<BackendApiKey> {
    await this.ensureReady();

    const key = `krapi_${uuidv4().replace(/-/g, "")}`;
    const now = new Date().toISOString();

    const query = `
      INSERT INTO api_keys (
        id, key, name, scopes, project_id, user_id, 
        expires_at, rate_limit, metadata, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      uuidv4(),
      key,
      apiKey.name,
      JSON.stringify(apiKey.scopes),
      apiKey.project_id,
      apiKey.user_id,
      apiKey.expires_at,
      apiKey.rate_limit,
      JSON.stringify(apiKey.metadata || {}),
      "active",
      now,
    ];

    const result = await this.pool.query(query, values);
    return this.mapApiKey(result.rows[0]);
  }

  // Get project API keys
  async getProjectApiKeys(projectId: string): Promise<BackendApiKey[]> {
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
  async getProjectApiKeyById(keyId: string): Promise<BackendApiKey | null> {
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
  async getUserApiKeys(userId: string): Promise<BackendApiKey[]> {
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
  }): Promise<BackendApiKey> {
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
  async getEmailConfig(
    projectId: string
  ): Promise<Record<string, unknown> | null> {
    await this.ensureReady();
    const query = `
      SELECT settings->>'email_config' as email_config
      FROM projects 
      WHERE id = $1
    `;
    const result = await this.queryWithRetry<{ email_config: string }>(query, [
      projectId,
    ]);
    const emailConfig = result[0]?.email_config;
    return emailConfig ? JSON.parse(emailConfig) : null;
  }

  async updateEmailConfig(
    projectId: string,
    config: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
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
    const result = await this.queryWithRetry<{ email_config: string }>(query, [
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

  // Email Template Methods
  async getEmailTemplates(
    projectId: string
  ): Promise<Record<string, unknown>[]> {
    await this.ensureReady();
    const query = `
      SELECT * FROM email_templates 
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.queryWithRetry(query, [projectId]);
    return result;
  }

  async getEmailTemplate(
    projectId: string,
    templateId: string
  ): Promise<Record<string, unknown> | null> {
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
    templateData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.ensureReady();
    const { name, subject, body, variables } = templateData as {
      name: string;
      subject: string;
      body: string;
      variables?: string[];
    };
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
    templateData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await this.ensureReady();
    const { name, subject, body, variables } = templateData as {
      name: string;
      subject: string;
      body: string;
      variables?: string[];
    };
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
    return result[0];
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

  // Additional API Key Methods
  async getProjectApiKey(
    projectId: string,
    keyId: string
  ): Promise<BackendApiKey | null> {
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
    updates: Partial<BackendApiKey>
  ): Promise<BackendApiKey | null> {
    await this.ensureReady();
    const { name, scopes, expires_at, status, user_id } = updates;
    const query = `
      UPDATE api_keys 
      SET name = $3, scopes = $4, expires_at = $5, status = $6, user_id = $7, updated_at = NOW()
      WHERE project_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await this.queryWithRetry(query, [
      projectId,
      keyId,
      name,
      JSON.stringify(scopes || []),
      expires_at,
      status || "active",
      user_id,
    ]);
    return result[0] ? this.mapApiKey(result[0]) : null;
  }

  async regenerateApiKey(
    projectId: string,
    keyId: string
  ): Promise<BackendApiKey | null> {
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
  async getActiveSessions(): Promise<BackendSession[]> {
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
  }): Promise<BackendChangelogEntry[]> {
    await this.ensureReady();

    let query = `SELECT * FROM changelog WHERE 1=1`;
    const values: unknown[] = [];
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
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      collection_id: row.collection_id as string,
      data: row.data as Record<string, unknown>,
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
    await this.pool.end();
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
      // Get total files and size
      const filesResult = await this.pool.query(
        "SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files WHERE project_id = $1",
        [projectId]
      );

      const totalFiles = parseInt(filesResult.rows[0].count);
      const totalSize = parseInt(filesResult.rows[0].total_size);

      // Get file type distribution
      const fileTypesResult = await this.pool.query(
        "SELECT mime_type, COUNT(*) as count FROM files WHERE project_id = $1 GROUP BY mime_type",
        [projectId]
      );

      const fileTypes: Record<string, number> = {};
      fileTypesResult.rows.forEach((row) => {
        fileTypes[row.mime_type] = parseInt(row.count);
      });

      // Get last upload time
      const lastUploadResult = await this.pool.query(
        "SELECT created_at FROM files WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1",
        [projectId]
      );

      const lastUpload =
        lastUploadResult.rows.length > 0
          ? new Date(lastUploadResult.rows[0].created_at)
          : null;

      // Get project storage info
      const projectResult = await this.pool.query(
        "SELECT storage_used, storage_limit FROM projects WHERE id = $1",
        [projectId]
      );

      const project = projectResult.rows[0];
      const storageUsed = project?.storage_used || 0;
      const storageLimit = project?.storage_limit || 1073741824; // 1GB default

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
      const result = await this.pool.query(
        `INSERT INTO folders (project_id, name, parent_folder_id, metadata, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          data.project_id,
          data.name,
          data.parent_folder_id,
          data.metadata ? JSON.stringify(data.metadata) : null,
          data.created_by,
          data.created_at,
        ]
      );

      return result.rows[0];
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

      const result = await this.pool.query(query, params);
      const folders = result.rows;

      if (options.include_files) {
        for (const folder of folders) {
          const filesResult = await this.pool.query(
            "SELECT COUNT(*) as count FROM files WHERE folder_id = $1",
            [folder.id]
          );
          folder.file_count = parseInt(filesResult.rows[0].count);
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
      // Check if folder has files
      const filesResult = await this.pool.query(
        "SELECT COUNT(*) as count FROM files WHERE folder_id = $1",
        [folderId]
      );

      if (parseInt(filesResult.rows[0].count) > 0) {
        throw new Error(
          "Cannot delete folder with files. Move or delete files first."
        );
      }

      // Check if folder has subfolders
      const subfoldersResult = await this.pool.query(
        "SELECT COUNT(*) as count FROM folders WHERE parent_folder_id = $1",
        [folderId]
      );

      if (parseInt(subfoldersResult.rows[0].count) > 0) {
        throw new Error(
          "Cannot delete folder with subfolders. Delete subfolders first."
        );
      }

      await this.pool.query(
        "DELETE FROM folders WHERE id = $1 AND project_id = $2",
        [folderId, projectId]
      );
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
      const result = await this.pool.query(
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
          await this.pool.query(
            "UPDATE files SET folder_id = $1 WHERE id = $2 AND project_id = $3",
            [destinationFolderId, fileId, projectId]
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
          await this.pool.query(
            "UPDATE files SET metadata = metadata || $1 WHERE id = $2 AND project_id = $3",
            [JSON.stringify(metadata), fileId, projectId]
          );
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

      const result = await this.pool.query(
        `INSERT INTO files (project_id, filename, original_name, mime_type, size, path, metadata, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          projectId,
          newFilename,
          originalFile.original_name,
          originalFile.mime_type,
          originalFile.size,
          newPath,
          originalFile.metadata,
          originalFile.uploaded_by || "system",
        ]
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
      const result = await this.pool.query(
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
      const result = await this.pool.query(
        "UPDATE files SET filename = $1 WHERE id = $2 AND project_id = $3 RETURNING *",
        [newName, fileId, projectId]
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
   * Update file metadata
   */
  async updateFileMetadata(
    projectId: string,
    fileId: string,
    metadata: Record<string, unknown>
  ): Promise<FileRecord> {
    try {
      const result = await this.pool.query(
        "UPDATE files SET metadata = metadata || $1 WHERE id = $2 AND project_id = $3 RETURNING *",
        [JSON.stringify(metadata), fileId, projectId]
      );

      if (result.rows.length === 0) {
        throw new Error("File not found");
      }

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

      const result = await this.pool.query(
        "UPDATE files SET metadata = metadata || $1 WHERE id = $2 AND project_id = $3 RETURNING *",
        [JSON.stringify({ tags: newTags }), fileId, projectId]
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

      const result = await this.pool.query(
        "UPDATE files SET metadata = metadata || $1 WHERE id = $2 AND project_id = $3 RETURNING *",
        [JSON.stringify({ tags: newTags }), fileId, projectId]
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
      const result = await this.pool.query(
        `SELECT fp.*, u.username, u.email 
         FROM file_permissions fp 
         JOIN project_users u ON fp.user_id = u.id 
         WHERE fp.file_id = $1 AND fp.project_id = $2`,
        [fileId, projectId]
      );

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
      const result = await this.pool.query(
        `INSERT INTO file_permissions (project_id, file_id, user_id, permission, granted_by, granted_at)
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (project_id, file_id, user_id) 
         DO UPDATE SET permission = $4, granted_by = $5, granted_at = $6
         RETURNING *`,
        [
          projectId,
          fileId,
          userId,
          permission,
          "system",
          new Date().toISOString(),
        ]
      );

      return result.rows[0];
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
      await this.pool.query(
        "DELETE FROM file_permissions WHERE project_id = $1 AND file_id = $2 AND user_id = $3",
        [projectId, fileId, userId]
      );
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
      const result = await this.pool.query(
        "SELECT * FROM file_versions WHERE project_id = $1 AND file_id = $2 ORDER BY version_number DESC",
        [projectId, fileId]
      );

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
      // Get current version number
      const versionResult = await this.pool.query(
        "SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM file_versions WHERE project_id = $1 AND file_id = $2",
        [projectId, fileId]
      );

      const versionNumber = versionResult.rows[0].next_version;

      const result = await this.pool.query(
        `INSERT INTO file_versions (project_id, file_id, version_number, filename, path, size, uploaded_by, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          projectId,
          fileId,
          versionNumber,
          file.originalname,
          file.path,
          file.size,
          userId,
          new Date().toISOString(),
        ]
      );

      return result.rows[0];
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
      const version = await this.pool.query(
        "SELECT * FROM file_versions WHERE id = $1 AND project_id = $2 AND file_id = $3",
        [versionId, projectId, fileId]
      );

      if (version.rows.length === 0) {
        throw new Error("Version not found");
      }

      // Update the main file with version data
      const result = await this.pool.query(
        "UPDATE files SET filename = $1, path = $2, size = $3 WHERE id = $4 AND project_id = $5 RETURNING *",
        [
          version.rows[0].filename,
          version.rows[0].path,
          version.rows[0].size,
          fileId,
          projectId,
        ]
      );

      return this.mapFile(result.rows[0]);
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
      const result = await this.pool.query(
        "UPDATE files SET metadata = metadata || $1 WHERE id = $2 AND project_id = $3 RETURNING *",
        [
          JSON.stringify({ public: true, public_at: new Date().toISOString() }),
          fileId,
          projectId,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error("File not found");
      }

      return this.mapFile(result.rows[0]);
    } catch (error) {
      console.error("Error making file public:", error);
      throw error;
    }
  }

  /**
   * Make file private
   */
  async makeFilePrivate(
    projectId: string,
    fileId: string
  ): Promise<FileRecord> {
    try {
      const result = await this.pool.query(
        "UPDATE files SET metadata = metadata || $1 WHERE id = $2 AND project_id = $3 RETURNING *",
        [
          JSON.stringify({
            public: false,
            private_at: new Date().toISOString(),
          }),
          fileId,
          projectId,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error("File not found");
      }

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
      // Delete all documents
      await this.pool.query("DELETE FROM documents WHERE project_id = $1", [
        projectId,
      ]);

      // Delete all collections
      await this.pool.query("DELETE FROM collections WHERE project_id = $1", [
        projectId,
      ]);

      // Delete all files
      await this.pool.query("DELETE FROM files WHERE project_id = $1", [
        projectId,
      ]);

      // Delete all folders
      await this.pool.query("DELETE FROM folders WHERE project_id = $1", [
        projectId,
      ]);

      // Delete all API keys
      await this.pool.query("DELETE FROM api_keys WHERE project_id = $1", [
        projectId,
      ]);

      // Delete all project users except the creator
      await this.pool.query(
        "DELETE FROM project_users WHERE project_id = $1 AND role != 'owner'",
        [projectId]
      );

      // Reset project stats
      await this.pool.query(
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
      // Get all test projects
      const testProjects = await this.pool.query(
        "SELECT id FROM projects WHERE settings->>'isTestProject' = 'true' OR name ILIKE '%test%'"
      );

      for (const project of testProjects.rows) {
        await this.resetProjectData(project.id);
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
          const result = await this.pool.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
            [table]
          );

          if (result.rows[0].exists) {
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
            const result = await this.pool.query(
              "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = $1 AND column_name = $2)",
              [table, column]
            );

            if (!result.rows[0].exists) {
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

      // Get total entries
      const totalResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM changelog ${whereClause}`,
        params
      );
      const totalEntries = parseInt(totalResult.rows[0].count);

      // Get by action type
      const actionTypeResult = await this.pool.query(
        `SELECT action, COUNT(*) as count FROM changelog ${whereClause} GROUP BY action`,
        params
      );
      const byActionType: Record<string, number> = {};
      actionTypeResult.rows.forEach((row) => {
        byActionType[row.action] = parseInt(row.count);
      });

      // Get by user
      const userResult = await this.pool.query(
        `SELECT performed_by, COUNT(*) as count FROM changelog ${whereClause} GROUP BY performed_by`,
        params
      );
      const byUser: Record<string, number> = {};
      userResult.rows.forEach((row) => {
        byUser[row.performed_by] = parseInt(row.count);
      });

      // Get by entity type
      const entityTypeResult = await this.pool.query(
        `SELECT entity_type, COUNT(*) as count FROM changelog ${whereClause} GROUP BY entity_type`,
        params
      );
      const byEntityType: Record<string, number> = {};
      entityTypeResult.rows.forEach((row) => {
        byEntityType[row.entity_type] = parseInt(row.count);
      });

      // Get timeline data
      let timelineQuery = `SELECT DATE(created_at) as date, COUNT(*) as count FROM changelog ${whereClause}`;
      if (options.period === "day") {
        timelineQuery += " GROUP BY DATE(created_at) ORDER BY date";
      } else if (options.period === "week") {
        timelineQuery +=
          " GROUP BY DATE_TRUNC('week', created_at) ORDER BY date";
      } else if (options.period === "month") {
        timelineQuery +=
          " GROUP BY DATE_TRUNC('month', created_at) ORDER BY date";
      }

      const timelineResult = await this.pool.query(timelineQuery, params);
      const timeline = timelineResult.rows.map((row) => ({
        date: row.date,
        count: parseInt(row.count),
      }));

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
        whereClause += ` AND performed_by = $${paramCount}`;
        params.push(options.user_id);
      }

      if (options.entity_type) {
        paramCount++;
        whereClause += ` AND entity_type = $${paramCount}`;
        params.push(options.entity_type);
      }

      const result = await this.pool.query(
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

      let whereClause = "WHERE created_at < NOW() - INTERVAL '$1 days'";
      const params: (number | string)[] = [options.older_than_days];
      let paramCount = 1;

      if (options.project_id) {
        paramCount++;
        whereClause += ` AND project_id = $${paramCount}`;
        params.push(options.project_id);
      }

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

      const deleteResult = await this.pool.query(
        `DELETE FROM changelog ${whereClause} RETURNING id`,
        params
      );

      result.purged = deleteResult.rows.length;

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
    const key = `krapi_${uuidv4().replace(/-/g, "")}`;

    const result = await this.pool.query(
      `INSERT INTO api_keys (key, name, scopes, project_id, user_id, expires_at, rate_limit, metadata, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        key,
        apiKey.name,
        JSON.stringify(apiKey.scopes),
        apiKey.project_ids,
        apiKey.user_id,
        apiKey.expires_at,
        apiKey.rate_limit,
        JSON.stringify(apiKey.metadata || {}),
        "active",
      ]
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
      const result = await this.pool.query(
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
      const result = await this.pool.query(
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

      // Test basic connection
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();

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
      const client = await this.pool.connect();
      try {
        // Check if admin_users table exists and has data
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_users'
          ) AND EXISTS (
            SELECT FROM admin_users LIMIT 1
          )
        `);

        return result.rows[0]?.exists === true;
      } finally {
        client.release();
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
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Check if uuid-ossp extension exists first (provides uuid_generate_v4)
      const uuidExtensionExists = await client.query(
        "SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'"
      );

      if (uuidExtensionExists.rows.length === 0) {
        try {
          await client.query('CREATE EXTENSION "uuid-ossp"');
          console.log("✅ uuid-ossp extension created successfully");
        } catch {
          console.log(
            "⚠️ uuid-ossp extension creation failed, continuing without it"
          );
          // Continue without the extension - we'll use alternative UUID generation
        }
      } else {
        console.log("✅ uuid-ossp extension already exists");
      }

      // Only create the most essential tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          owner_id UUID NOT NULL REFERENCES admin_users(id),
          api_key VARCHAR(255) UNIQUE NOT NULL,
          allowed_origins TEXT[] DEFAULT '{}',
          settings JSONB DEFAULT '{}'::jsonb,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          storage_used BIGINT DEFAULT 0,
          api_calls_count BIGINT DEFAULT 0,
          last_api_call TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS collections (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          fields JSONB NOT NULL DEFAULT '[]'::jsonb,
          indexes JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID NOT NULL REFERENCES admin_users(id),
          UNIQUE(project_id, name)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID NOT NULL REFERENCES admin_users(id)
        )
      `);

      // Project Users Table (for project-specific user accounts)
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

      // Add missing essential tables for auth system
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          token VARCHAR(500) UNIQUE NOT NULL,
          user_id UUID REFERENCES admin_users(id),
          project_id UUID REFERENCES projects(id),
          type VARCHAR(50) NOT NULL CHECK (type IN ('admin', 'project')),
          scopes TEXT[] NOT NULL DEFAULT '{}',
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          consumed BOOLEAN DEFAULT false,
          consumed_at TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          key VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          type VARCHAR(50) DEFAULT 'admin',
          owner_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
          scopes TEXT[] DEFAULT '{}',
          project_ids UUID[] DEFAULT '{}',
          expires_at TIMESTAMP,
          rate_limit INTEGER,
          metadata JSONB DEFAULT '{}'::jsonb,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_used_at TIMESTAMP,
          usage_count BIGINT DEFAULT 0
        )
      `);

      // Add files table for project statistics
      await client.query(`
        CREATE TABLE IF NOT EXISTS files (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

      await client.query(`
        CREATE TABLE IF NOT EXISTS changelog (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create default admin user if it doesn't exist
      const adminCount = await client.query("SELECT COUNT(*) FROM admin_users");
      if (parseInt(adminCount.rows[0].count) === 0) {
        const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
        const defaultPassword =
          process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
        const defaultEmail =
          process.env.DEFAULT_ADMIN_EMAIL || "admin@krapi.local";

        const hashedPassword = await this.hashPassword(defaultPassword);
        const masterApiKey = `mak_${uuidv4().replace(/-/g, "")}`;

        await client.query(
          `INSERT INTO admin_users (username, email, password_hash, role, access_level, api_key, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            defaultUsername,
            defaultEmail,
            hashedPassword,
            "master_admin",
            "full",
            masterApiKey,
            true,
          ]
        );
        console.log(`✅ Default admin user created: ${defaultUsername}`);
        console.log(`🔑 Master API Key: ${masterApiKey}`);
      }

      await client.query("COMMIT");
      console.log("✅ Essential tables and admin user created");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      DatabaseService.isCreatingTables = false;
    }
  }

  // Ensure default admin user exists
  private async ensureDefaultAdmin(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@localhost";

      const result = await client.query(
        "SELECT id FROM admin_users WHERE username = $1",
        [defaultUsername]
      );

      if (result.rows.length === 0) {
        const hashedPassword = await this.hashPassword(defaultPassword);
        const masterApiKey = `mak_${uuidv4().replace(/-/g, "")}`;

        await client.query(
          `INSERT INTO admin_users (username, email, password_hash, role, access_level, api_key, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            defaultUsername,
            defaultEmail,
            hashedPassword,
            "master_admin",
            "full",
            masterApiKey,
            true, // Default admin is active by default
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
      client.release();
    }
  }

  // Ultra-fast initialization - just connect, no initialization
  private async initializeUltraFast(): Promise<void> {
    try {
      console.log(
        "🚀 Ultra-fast database connection (skipping initialization)..."
      );

      // Test basic connection
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();

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
