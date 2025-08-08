import { Pool } from "pg";

interface Migration {
  version: number;
  name: string;
  up: (client: any) => Promise<void>;
}

export class MigrationService {
  private pool: Pool;
  private migrations: Migration[] = [];

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeMigrations();
  }

  private initializeMigrations() {
    this.migrations = [
      {
        version: 1,
        name: "add_active_column_to_projects",
        up: async (client) => {
          // Check if column exists (projects table uses is_active, not active)
          const result = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'projects' AND column_name = 'is_active'
          `);

          if (result.rows.length === 0) {
            await client.query(`
              ALTER TABLE projects 
              ADD COLUMN is_active BOOLEAN DEFAULT true
            `);
            console.log("Added 'is_active' column to projects table");
          }
        },
      },
      {
        version: 2,
        name: "fix_collections_indexes",
        up: async (client) => {
          // Ensure indexes column exists
          const result = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'collections' AND column_name = 'indexes'
          `);

          if (result.rows.length === 0) {
            await client.query(`
              ALTER TABLE collections 
              ADD COLUMN indexes JSONB DEFAULT '[]'::jsonb
            `);
            console.log("Added 'indexes' column to collections table");
          }
        },
      },
      {
        version: 3,
        name: "add_document_count_to_collections",
        up: async (client) => {
          const result = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'collections' AND column_name = 'document_count'
          `);

          if (result.rows.length === 0) {
            await client.query(`
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
        up: async (client) => {
          // Add scopes column if missing
          const result = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'admin_users' AND column_name = 'scopes'
          `);

          if (result.rows.length === 0) {
            await client.query(`
              ALTER TABLE admin_users 
              ADD COLUMN scopes TEXT[] DEFAULT '{}'
            `);
            console.log("Added 'scopes' column to admin_users table");

            // Update existing master admins with all scopes
            await client.query(`
              UPDATE admin_users 
              SET scopes = ARRAY['master'] 
              WHERE role = 'master_admin'
            `);
          }
        },
      },
      {
        version: 5,
        name: "add_project_specific_columns",
        up: async (client) => {
          // Add project_ids to admin_users for project-specific admins
          const result = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'admin_users' AND column_name = 'project_ids'
          `);

          if (result.rows.length === 0) {
            await client.query(`
              ALTER TABLE admin_users 
              ADD COLUMN project_ids UUID[] DEFAULT NULL
            `);
            console.log("Added 'project_ids' column to admin_users table");
          }
        },
      },
      {
        version: 6,
        name: "fix_projects_table_columns",
        up: async (client) => {
          // Standardize on is_active column naming
          const hasIsActive = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'projects' AND column_name = 'is_active'
          `);

          const hasActive = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'projects' AND column_name = 'active'
          `);

          // If we have active but not is_active, rename it to is_active
          if (hasActive.rows.length > 0 && hasIsActive.rows.length === 0) {
            await client.query(`
              ALTER TABLE projects 
              RENAME COLUMN active TO is_active
            `);
            console.log("Renamed 'active' to 'is_active' in projects table");
          }

          // If we have neither, add is_active column
          if (hasIsActive.rows.length === 0 && hasActive.rows.length === 0) {
            await client.query(`
              ALTER TABLE projects 
              ADD COLUMN is_active BOOLEAN DEFAULT true
            `);
            console.log("Added 'is_active' column to projects table");
          }
        },
      },
    ];
  }

  async runMigrations() {
    const client = await this.pool.connect();
    try {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Get executed migrations
      const executedResult = await client.query(
        "SELECT version FROM migrations ORDER BY version"
      );
      const executedVersions = new Set(
        executedResult.rows.map((row) => row.version)
      );

      // Run pending migrations
      for (const migration of this.migrations) {
        if (!executedVersions.has(migration.version)) {
          console.log(
            `Running migration ${migration.version}: ${migration.name}`
          );

          await client.query("BEGIN");
          try {
            await migration.up(client);

            // Record migration
            await client.query(
              "INSERT INTO migrations (version, name) VALUES ($1, $2)",
              [migration.version, migration.name]
            );

            await client.query("COMMIT");
            console.log(
              `Migration ${migration.version} completed successfully`
            );
          } catch (error) {
            await client.query("ROLLBACK");
            console.error(`Migration ${migration.version} failed:`, error);
            throw error;
          }
        }
      }

      console.log("All migrations completed");
    } finally {
      client.release();
    }
  }

  async checkAndFixSchema() {
    const client = await this.pool.connect();
    try {
      console.log("Checking database schema integrity...");

      // Check for missing columns and fix them
      const fixes = [
        {
          table: "projects",
          column: "is_active",
          fix: "ALTER TABLE projects ADD COLUMN is_active BOOLEAN DEFAULT true",
        },
        {
          table: "collections",
          column: "indexes",
          fix: "ALTER TABLE collections ADD COLUMN indexes JSONB DEFAULT '[]'::jsonb",
        },
        {
          table: "collections",
          column: "document_count",
          fix: "ALTER TABLE collections ADD COLUMN document_count INTEGER DEFAULT 0",
        },
        {
          table: "admin_users",
          column: "scopes",
          fix: "ALTER TABLE admin_users ADD COLUMN scopes TEXT[] DEFAULT '{}'",
        },
        {
          table: "admin_users",
          column: "project_ids",
          fix: "ALTER TABLE admin_users ADD COLUMN project_ids UUID[] DEFAULT NULL",
        },
      ];

      for (const { table, column, fix } of fixes) {
        try {
          const result = await client.query(
            `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = $2
          `,
            [table, column]
          );

          if (result.rows.length === 0) {
            console.log(`Fixing missing column: ${table}.${column}`);
            await client.query(fix);
          }
        } catch (error) {
          console.error(`Failed to fix ${table}.${column}:`, error);
          // Continue with other fixes
        }
      }

      // Fix column type mismatches
      await this.fixColumnTypes(client);

      // Check for missing indexes
      const indexes = [
        {
          name: "idx_collections_project_id",
          table: "collections",
          definition:
            "CREATE INDEX idx_collections_project_id ON collections(project_id)",
        },
        {
          name: "idx_documents_collection_id",
          table: "documents",
          definition:
            "CREATE INDEX idx_documents_collection_id ON documents(collection_id)",
        },
        {
          name: "idx_sessions_token",
          table: "sessions",
          definition: "CREATE INDEX idx_sessions_token ON sessions(token)",
        },
        {
          name: "idx_projects_is_active",
          table: "projects",
          definition: "CREATE INDEX idx_projects_is_active ON projects(is_active)",
        },
        {
          name: "idx_api_keys_key",
          table: "api_keys",
          definition: "CREATE INDEX idx_api_keys_key ON api_keys(key)",
        },
      ];

      for (const { name, table, definition } of indexes) {
        try {
          const result = await client.query(
            `
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = $1 AND indexname = $2
          `,
            [table, name]
          );

          if (result.rows.length === 0) {
            console.log(`Creating missing index: ${name}`);
            await client.query(definition);
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
    } finally {
      client.release();
    }
  }

  private async fixColumnTypes(client: any) {
    try {
      // Fix settings column type if it's not JSONB
      const settingsType = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'settings'
      `);

      if (
        settingsType.rows.length > 0 &&
        settingsType.rows[0].data_type !== "jsonb"
      ) {
        console.log("Fixing projects.settings column type");
        await client.query(`
          ALTER TABLE projects 
          ALTER COLUMN settings TYPE JSONB 
          USING settings::jsonb
        `);
      }

      // Fix indexes column type if it's not JSONB
      const indexesType = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'collections' AND column_name = 'indexes'
      `);

      if (
        indexesType.rows.length > 0 &&
        indexesType.rows[0].data_type !== "jsonb"
      ) {
        console.log("Fixing collections.indexes column type");
        await client.query(`
          ALTER TABLE collections 
          ALTER COLUMN indexes TYPE JSONB 
          USING indexes::jsonb
        `);
      }
    } catch (error) {
      console.error("Error fixing column types:", error);
    }
  }
}
