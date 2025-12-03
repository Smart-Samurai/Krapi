import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { SQLiteAdapter } from "../../sqlite-adapter.service";
import { DatabaseSchemaService } from "../schema/database-schema.service";
import { DatabaseSeedService } from "../schema/database-seed.service";

import { DatabaseCoreService } from "./database-core.service";

/**
 * Database Initialization Service
 *
 * Handles all database initialization methods (instant, fast, ultra-fast, withRetry).
 * Manages connection attempts and initialization strategies.
 */
export class DatabaseInitializationService {
  private _isInitializingTables = false;

  constructor(
    private core: DatabaseCoreService,
    private dbManager: MultiDatabaseManager,
    private adapter: SQLiteAdapter,
    private schemaService: DatabaseSchemaService,
    private _seedService: DatabaseSeedService // Reserved for future seeding operations
  ) {}

  /**
   * Initialize with retry logic (production mode)
   */
  async initializeWithRetry(): Promise<void> {
    while (
      this.core.getConnectionAttempts() <
        this.core.getMaxConnectionAttempts() &&
      !this.core.isConnected()
    ) {
      this.core.incrementConnectionAttempts();
      console.log(
        `Attempting to connect to SQLite (attempt ${this.core.getConnectionAttempts()}/${this.core.getMaxConnectionAttempts()})...`
      );

      try {
        // Connect to main database
        await this.dbManager.connectMain();

        // Test the connection
        await this.dbManager.queryMain("SELECT 1");

        this.core.setConnected(true);
        console.log("Successfully connected to main SQLite database");

        // Initialize main database tables first
        if (process.env.NODE_ENV === "development") {
          await this.schemaService.createEssentialTables();
        } else {
          await this.schemaService.initializeTables();
        }

        // Skip migrations for fresh database (test environment)
        console.log("Skipping migrations - using direct table initialization");

        // Resolve the ready promise on successful initialization
        this.core.resolveReady();
        break;
      } catch (error) {
        console.error(
          `Failed to connect to SQLite (attempt ${this.core.getConnectionAttempts()}):`,
          error
        );

        if (
          this.core.getConnectionAttempts() <
          this.core.getMaxConnectionAttempts()
        ) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.min(
            1000 * Math.pow(2, this.core.getConnectionAttempts() - 1),
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
          this.core.rejectReady(connectionError);
          throw connectionError;
        }
      }
    }
  }

  /**
   * Fast initialization for development mode - skips heavy operations
   */
  async initializeFast(): Promise<void> {
    try {
      console.log("🔧 Fast database initialization for development...");

      // Connect to the database first
      await this.adapter.connect();

      // Test basic connection
      await this.dbManager.connectMain();
      await this.dbManager.queryMain("SELECT 1");

      console.log("✅ Database connection successful");

      // Check if database is already initialized (tables exist)
      const isInitialized = await this.isDatabaseInitialized();

      if (isInitialized) {
        console.log("✅ Database already initialized, skipping table creation");
      } else {
        console.log("🆕 First time setup: Creating essential tables...");
        // Create only essential tables without heavy validation
        const tablesCreated = await this.schemaService.createEssentialTables();

        if (tablesCreated) {
          // Create default admin user if it doesn't exist
          await this.ensureDefaultAdmin();
          console.log("✅ Database initialization completed");
        } else {
          console.log("⚠️ Tables were not created, skipping admin creation");
        }
      }

      this.core.setConnected(true);
      this.core.resolveReady();
    } catch (error) {
      console.error("Fast initialization failed:", error);
      throw error;
    }
  }

  /**
   * Ultra-fast initialization - just connect, no initialization
   */
  async initializeUltraFast(): Promise<void> {
    try {
      console.log(
        "🚀 Ultra-fast database connection (skipping initialization)..."
      );

      // Connect to the database first
      await this.adapter.connect();

      // Test basic connection
      await this.dbManager.connectMain();
      await this.dbManager.queryMain("SELECT 1");

      console.log("✅ Database connection successful");

      // Mark as connected immediately
      this.core.setConnected(true);
      this.core.resolveReady();
    } catch (error) {
      console.error("Ultra-fast initialization failed:", error);
      throw error;
    }
  }

  /**
   * Instant initialization - no database operations at all
   */
  async initializeInstant(): Promise<void> {
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
        this.core.setConnected(true);
        this.core.resolveReady();
      } else {
        console.log(
          "🔄 Tables don't exist, falling back to fast initialization..."
        );

        // In development mode, mark as ready immediately and create tables in background
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🚀 Development mode: Marking database as ready immediately"
          );
          this.core.setConnected(true);
          this.core.resolveReady();

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

  /**
   * Check if database is already initialized by looking for key tables
   */
  private async isDatabaseInitialized(): Promise<boolean> {
    try {
      try {
        // Check if admin_users table exists and has data (SQLite uses sqlite_master)
        await this.dbManager.connectMain();
        const tableExistsResult = await this.dbManager.queryMain(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='admin_users'`
        );
        const hasDataResult = await this.dbManager.queryMain(
          `SELECT COUNT(*) as count FROM admin_users LIMIT 1`
        );
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

  /**
   * Ensure default admin user exists
   */
  private async ensureDefaultAdmin(): Promise<void> {
    try {
      const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@localhost";

      await this.dbManager.connectMain();
      const result = await this.dbManager.queryMain(
        "SELECT id FROM admin_users WHERE username = $1",
        [defaultUsername]
      );

      if (result.rows.length === 0) {
        const hashedPassword = await this.hashPassword(defaultPassword);
        const adminId = uuidv4();
        const masterApiKey = `mak_${uuidv4().replace(/-/g, "")}`;

        await this.dbManager.queryMain(
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
    }
  }

  /**
   * Hash password for admin user
   */
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Get initialization flag
   */
  checkInitializingTables(): boolean {
    return this._isInitializingTables;
  }

  /**
   * Set initialization flag
   */
  setInitializingTables(value: boolean): void {
    this._isInitializingTables = value;
  }

  /** Get seed service (reserved for future use) */
  protected getSeedService() {
    return this._seedService;
  }
}
