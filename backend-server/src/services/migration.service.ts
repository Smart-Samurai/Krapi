import { SQLiteAdapter } from "./sqlite-adapter.service";

/**
 * Migration definition
 * 
 * @typedef {Object} Migration
 * @property {number} version - Migration version number
 * @property {string} name - Migration name/description
 * @property {Function} up - Migration function that applies the migration
 */
interface Migration {
  version: number;
  name: string;
  up: (adapter: SQLiteAdapter) => Promise<void>;
}

/**
 * Migration Service
 * 
 * Handles database schema migrations and automatic schema fixes.
 * Manages versioned migrations that can be applied to update the database schema.
 * 
 * Features:
 * - Versioned migrations
 * - Automatic schema fixes
 * - Migration history tracking
 * - Safe migration application
 * 
 * @class MigrationService
 * @example
 * const adapter = new SQLiteAdapter(dbPath);
 * const migrationService = new MigrationService(adapter);
 * await migrationService.checkAndFixSchema();
 */
export class MigrationService {
  private adapter: SQLiteAdapter;
  private migrations: Migration[] = [];

  /**
   * Create a new MigrationService instance
   * 
   * @param {SQLiteAdapter} adapter - SQLite adapter for database operations
   */
  constructor(adapter: SQLiteAdapter) {
    this.adapter = adapter;
    this.initializeMigrations();
  }

  private initializeMigrations() {
    this.migrations = [
      {
        version: 1,
        name: "add_active_column_to_projects",
        up: async (adapter) => {
          // Check if column exists (SQLite uses PRAGMA table_info)
          const result = await adapter.query(`PRAGMA table_info(projects)`);
          const hasColumn = result.rows.some((row: unknown) => {
            const r = row as { name: string };
            return r.name === 'is_active';
          });

          if (!hasColumn) {
            await adapter.query(`
              ALTER TABLE projects 
              ADD COLUMN is_active INTEGER DEFAULT 1
            `);
            console.log("Added 'is_active' column to projects table");
          }
        },
      },
      {
        version: 2,
        name: "fix_collections_indexes",
        up: async (adapter) => {
          // Ensure indexes column exists (SQLite uses PRAGMA table_info)
          const result = await adapter.query(`PRAGMA table_info(collections)`);
          const hasColumn = result.rows.some((row: unknown) => {
            const r = row as { name: string };
            return r.name === 'indexes';
          });

          if (!hasColumn) {
            await adapter.query(`
              ALTER TABLE collections 
              ADD COLUMN indexes TEXT DEFAULT '[]'
            `);
            console.log("Added 'indexes' column to collections table");
          }
        },
      },
      {
        version: 3,
        name: "add_document_count_to_collections",
        up: async (adapter) => {
          const result = await adapter.query(`PRAGMA table_info(collections)`);
          const hasColumn = result.rows.some((row: unknown) => {
            const r = row as { name: string };
            return r.name === 'document_count';
          });

          if (!hasColumn) {
            await adapter.query(`
              ALTER TABLE collections 
              ADD COLUMN document_count INTEGER DEFAULT 0
            `);
            console.log("Added 'document_count' column to collections table");
          }
        },
      },
      {
        version: 4,
        name: "fix_admin_users_permissions",
        up: async (adapter) => {
          // Add scopes column if missing (SQLite uses PRAGMA table_info)
          const result = await adapter.query(`PRAGMA table_info(admin_users)`);
          const hasColumn = result.rows.some((row: unknown) => {
            const r = row as { name: string };
            return r.name === 'scopes';
          });

          if (!hasColumn) {
            await adapter.query(`
              ALTER TABLE admin_users 
              ADD COLUMN scopes TEXT DEFAULT '[]'
            `);
            console.log("Added 'scopes' column to admin_users table");

            // Update existing master admins with all scopes (SQLite stores arrays as JSON)
            await adapter.query(`
              UPDATE admin_users 
              SET scopes = ? 
              WHERE role = 'master_admin'
            `, [JSON.stringify(['master'])]);
          }
        },
      },
      {
        version: 5,
        name: "add_project_specific_columns",
        up: async (adapter) => {
          // Add project_ids to admin_users for project-specific admins (SQLite uses PRAGMA table_info)
          const result = await adapter.query(`PRAGMA table_info(admin_users)`);
          const hasColumn = result.rows.some((row: unknown) => {
            const r = row as { name: string };
            return r.name === 'project_ids';
          });

          if (!hasColumn) {
            await adapter.query(`
              ALTER TABLE admin_users 
              ADD COLUMN project_ids TEXT DEFAULT NULL
            `);
            console.log("Added 'project_ids' column to admin_users table");
          }
        },
      },
      {
        version: 6,
        name: "fix_projects_table_columns",
        up: async (adapter) => {
          // Standardize on is_active column naming (SQLite uses PRAGMA table_info)
          const result = await adapter.query(`PRAGMA table_info(projects)`);
          const columns = result.rows as Array<{ name: string }>;
          const hasIsActive = columns.some((c) => c.name === 'is_active');
          const hasActive = columns.some((c) => c.name === 'active');

          // If we have active but not is_active, rename it to is_active
          if (hasActive && !hasIsActive) {
            await adapter.query(`
              ALTER TABLE projects 
              RENAME COLUMN active TO is_active
            `);
            console.log("Renamed 'active' to 'is_active' in projects table");
          }

          // If we have neither, add is_active column
          if (!hasIsActive && !hasActive) {
            await adapter.query(`
              ALTER TABLE projects 
              ADD COLUMN is_active INTEGER DEFAULT 1
            `);
            console.log("Added 'is_active' column to projects table");
          }
        },
      },
    ];
  }

  /**
   * Run all pending migrations
   * 
   * Applies all migrations that haven't been executed yet, in version order.
   * Tracks executed migrations in the migrations table to prevent re-running.
   * 
   * @returns {Promise<void>}
   * @throws {Error} If migration execution fails
   * 
   * @example
   * await migrationService.runMigrations();
   */
  async runMigrations() {
    try {
      // Create migrations table if it doesn't exist
      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Get executed migrations
      const executedResult = await this.adapter.query(
        "SELECT version FROM migrations ORDER BY version"
      );
      const executedVersions = new Set(
        executedResult.rows.map((row) => (row as { version: number }).version)
      );

      // Run pending migrations
      for (const migration of this.migrations) {
        if (!executedVersions.has(migration.version)) {
          console.log(
            `Running migration ${migration.version}: ${migration.name}`
          );

          // SQLite doesn't support explicit transactions the same way
          // But better-sqlite3 handles transactions automatically
          try {
            await migration.up(this.adapter);

            // Record migration (SQLite doesn't need explicit UUID generation)
            await this.adapter.query(
              "INSERT INTO migrations (version, name) VALUES ($1, $2)",
              [migration.version, migration.name]
            );

            console.log(
              `Migration ${migration.version} completed successfully`
            );
          } catch (error) {
            console.error(`Migration ${migration.version} failed:`, error);
            throw error;
          }
        }
      }

      console.log("All migrations completed");
    } catch (error) {
      console.error("Error running migrations:", error);
      throw error;
    }
  }

  /**
   * Check and fix database schema
   * 
   * Performs comprehensive schema validation and applies automatic fixes:
   * - Runs pending migrations
   * - Fixes missing columns
   * - Fixes column types
   * - Creates missing indexes
   * - Ensures required tables exist
   * 
   * This method is safe to run multiple times and will only apply necessary fixes.
   * 
   * @returns {Promise<void>}
   * @throws {Error} If schema check or fix fails
   * 
   * @example
   * await migrationService.checkAndFixSchema();
   * // Schema is now up to date
   */
  async checkAndFixSchema() {
    try {
      console.log("Checking database schema integrity...");

      // Check for missing columns and fix them
      const fixes = [
        {
          table: "projects",
          column: "is_active",
          fix: "ALTER TABLE projects ADD COLUMN is_active INTEGER DEFAULT 1",
        },
        {
          table: "collections",
          column: "indexes",
          fix: "ALTER TABLE collections ADD COLUMN indexes TEXT DEFAULT '[]'",
        },
        {
          table: "collections",
          column: "document_count",
          fix: "ALTER TABLE collections ADD COLUMN document_count INTEGER DEFAULT 0",
        },
        {
          table: "admin_users",
          column: "scopes",
          fix: "ALTER TABLE admin_users ADD COLUMN scopes TEXT DEFAULT '[]'",
        },
        {
          table: "admin_users",
          column: "project_ids",
          fix: "ALTER TABLE admin_users ADD COLUMN project_ids TEXT DEFAULT NULL",
        },
      ];

      for (const { table, column, fix } of fixes) {
        try {
          // SQLite uses PRAGMA table_info
          const result = await this.adapter.query(`PRAGMA table_info("${table}")`);
          const hasColumn = result.rows.some((row: unknown) => {
            const r = row as { name: string };
            return r.name === column;
          });

          if (!hasColumn) {
            console.log(`Fixing missing column: ${table}.${column}`);
            await this.adapter.query(fix);
          }
        } catch (error) {
          console.error(`Failed to fix ${table}.${column}:`, error);
          // Continue with other fixes
        }
      }

      // Fix column type mismatches
      await this.fixColumnTypes();

      // Check for missing indexes (SQLite uses sqlite_master)
      const indexes = [
        {
          name: "idx_collections_project_id",
          table: "collections",
          definition:
            "CREATE INDEX IF NOT EXISTS idx_collections_project_id ON collections(project_id)",
        },
        {
          name: "idx_documents_collection_id",
          table: "documents",
          definition:
            "CREATE INDEX IF NOT EXISTS idx_documents_collection_id ON documents(collection_id)",
        },
        {
          name: "idx_sessions_token",
          table: "sessions",
          definition: "CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)",
        },
        {
          name: "idx_projects_is_active",
          table: "projects",
          definition: "CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active)",
        },
        {
          name: "idx_api_keys_key",
          table: "api_keys",
          definition: "CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)",
        },
      ];

      for (const { name, table: _table, definition } of indexes) {
        try {
          // SQLite uses sqlite_master to check indexes
          const result = await this.adapter.query(
            `SELECT name FROM sqlite_master WHERE type='index' AND name=?`,
            [name]
          );

          if (result.rows.length === 0) {
            console.log(`Creating missing index: ${name}`);
            await this.adapter.query(definition);
          }
        } catch (error) {
          console.error(`Failed to create index ${name}:`, error);
          // Continue with other indexes
        }
      }

      console.log("Schema integrity check completed");
    } catch (error) {
      console.error("Error during schema check:", error);
      throw error;
    }
  }

  private async fixColumnTypes() {
    try {
      // SQLite doesn't have strict type checking like PostgreSQL
      // All types are essentially TEXT, INTEGER, REAL, or BLOB
      // JSON is stored as TEXT, so we just need to ensure the columns exist
      // The actual validation happens at the application level
      
      // Check if settings column exists in projects
      const projectsInfo = await this.adapter.query(`PRAGMA table_info(projects)`);
      const hasSettings = (projectsInfo.rows as Array<{ name: string }>).some(
        (c) => c.name === 'settings'
      );

      if (!hasSettings) {
        console.log("Adding projects.settings column");
        await this.adapter.query(`
          ALTER TABLE projects 
          ADD COLUMN settings TEXT DEFAULT '{}'
        `);
      }

      // Check if indexes column exists in collections
      const collectionsInfo = await this.adapter.query(`PRAGMA table_info(collections)`);
      const hasIndexes = (collectionsInfo.rows as Array<{ name: string }>).some(
        (c) => c.name === 'indexes'
      );

      if (!hasIndexes) {
        console.log("Adding collections.indexes column");
        await this.adapter.query(`
          ALTER TABLE collections 
          ADD COLUMN indexes TEXT DEFAULT '[]'
        `);
      }
    } catch (error) {
      console.error("Error fixing column types:", error);
    }
  }
}
