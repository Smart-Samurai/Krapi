/**
 * Multi-Database Manager Service
 * 
 * Manages multiple SQLite database connections:
 * - Main database (krapi_main.db): Admin/app data and project metadata
 * - Project databases (project_{projectId}.db): Project-specific data
 * 
 * This architecture enables:
 * - Independent backups per project
 * - Version control per project database
 * - Isolated project data
 */

import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";

// SQLiteAdapter imported but not used directly - accessed via adapter property

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export class MultiDatabaseManager {
  private mainDb: Database.Database | null = null;
  private projectDbs: Map<string, Database.Database> = new Map();
  private mainDbPath: string;
  private projectsDbDir: string;
  private isMainConnected = false;

  constructor(
    mainDbPath?: string,
    projectsDbDir?: string
  ) {
    // Main database path (e.g., data/krapi_main.db)
    this.mainDbPath = mainDbPath || 
      path.join(process.cwd(), "data", "krapi_main.db");
    
    // Projects database directory (e.g., data/projects/)
    // Each project will have its own folder: data/projects/{projectId}/
    // Inside each project folder: database.db and files/ subfolder
    this.projectsDbDir = projectsDbDir || 
      path.join(process.cwd(), "data", "projects");

    // Ensure directories exist
    const mainDbDir = path.dirname(this.mainDbPath);
    if (!fs.existsSync(mainDbDir)) {
      fs.mkdirSync(mainDbDir, { recursive: true });
    }
    if (!fs.existsSync(this.projectsDbDir)) {
      fs.mkdirSync(this.projectsDbDir, { recursive: true });
    }
  }

  /**
   * Connect to the main database
   * 
   * Establishes connection to the main database (krapi_main.db).
   * Enables WAL (Write-Ahead Logging) mode for better concurrency.
   * Safe to call multiple times - will reuse existing connection.
   * 
   * @returns {Promise<void>}
   * @throws {Error} If connection fails
   * 
   * @example
   * await manager.connectMain();
   * // Main database is now connected
   */
  async connectMain(): Promise<void> {
    if (this.mainDb && this.isMainConnected) {
      return;
    }

    try {
      // Close existing connection if any
      if (this.mainDb) {
        this.mainDb.close();
      }

      this.mainDb = new Database(this.mainDbPath);
      this.mainDb.pragma("journal_mode = WAL"); // Enable WAL mode for better concurrency
      this.isMainConnected = true;
    } catch (error) {
      throw new Error(`Failed to connect to main database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get connection to a project-specific database
   * 
   * Returns a connection to the project-specific database, creating it
   * if it doesn't exist. Also creates the project folder structure and
   * initializes required tables.
   * 
   * Connections are cached and reused for performance.
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Database.Database>} SQLite database connection
   * @throws {Error} If projectId is missing or database creation fails
   * 
   * @example
   * const db = await manager.getProjectDb('project-uuid');
   * // Use db for project-specific queries
   */
  async getProjectDb(projectId: string): Promise<Database.Database> {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // Return existing connection if available
    if (this.projectDbs.has(projectId)) {
      const db = this.projectDbs.get(projectId);
      if (db && db.open) {
        return db;
      }
      // Remove stale connection
      this.projectDbs.delete(projectId);
    }

    // Create project-specific folder structure: data/projects/{projectId}/
    const projectFolder = path.join(this.projectsDbDir, projectId);
    if (!fs.existsSync(projectFolder)) {
      fs.mkdirSync(projectFolder, { recursive: true });
    }
    
    // Database file inside project folder: data/projects/{projectId}/database.db
    const dbPath = path.join(projectFolder, "database.db");
    
    // Also create files subfolder for project-specific file storage
    const filesFolder = path.join(projectFolder, "files");
    if (!fs.existsSync(filesFolder)) {
      fs.mkdirSync(filesFolder, { recursive: true });
    }
    
    try {
      const db = new Database(dbPath);
      db.pragma("journal_mode = WAL");
      
      // Store connection
      this.projectDbs.set(projectId, db);
      
      // Initialize project database schema
      await this.initializeProjectDatabase(db);
      
      return db;
    } catch (error) {
      throw new Error(`Failed to connect to project database ${projectId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initialize schema for a project database
   */
  private async initializeProjectDatabase(db: Database.Database): Promise<void> {
    // Collections table
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        fields TEXT NOT NULL,
        indexes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        UNIQUE(project_id, name)
      )
    `);

    // Documents table
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        data TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      )
    `);

    // Files table
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        url TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // API Keys table (project-specific)
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'project',
        owner_id TEXT NOT NULL,
        scopes TEXT NOT NULL,
        project_ids TEXT,
        expires_at TEXT,
        last_used_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        metadata TEXT
      )
    `);

    // Project users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_users (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL,
        permissions TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      )
    `);

    // Changelog table (project-specific)
    db.exec(`
      CREATE TABLE IF NOT EXISTS changelog (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        collection_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        changes TEXT,
        user_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Folders table (project-specific)
    db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_folder_id TEXT,
        metadata TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, name, parent_folder_id)
      )
    `);

    // File permissions table (project-specific)
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_permissions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        permission TEXT NOT NULL,
        granted_by TEXT,
        granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, file_id, user_id)
      )
    `);

    // File versions table (project-specific)
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        filename TEXT NOT NULL,
        path TEXT NOT NULL,
        size INTEGER NOT NULL,
        uploaded_by TEXT,
        uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, file_id, version_number)
      )
    `);

    // Add metadata column to files table if it doesn't exist
    try {
      db.exec(`ALTER TABLE files ADD COLUMN metadata TEXT DEFAULT '{}'`);
    } catch {
      // Column might already exist, ignore error
    }

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_collections_project ON collections(project_id);
      CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection_id);
      CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_documents_deleted ON documents(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
      CREATE INDEX IF NOT EXISTS idx_project_users_project ON project_users(project_id);
      CREATE INDEX IF NOT EXISTS idx_changelog_project ON changelog(project_id);
      CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_folder_id);
      CREATE INDEX IF NOT EXISTS idx_file_permissions_file ON file_permissions(file_id);
      CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions(file_id);
    `);
  }

  /**
   * Query the main database
   * 
   * Executes a SQL query on the main database. Automatically connects
   * if not already connected. Converts PostgreSQL-style parameters ($1, $2)
   * to SQLite-style parameters (?).
   * 
   * @param {string} sql - SQL query string
   * @param {unknown[]} [params] - Query parameters
   * @returns {Promise<QueryResult>} Query results with rows and rowCount
   * @throws {Error} If query execution fails
   * 
   * @example
   * const result = await manager.queryMain('SELECT * FROM projects WHERE id = $1', ['project-id']);
   */
  async queryMain(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult> {
    if (!this.mainDb || !this.isMainConnected) {
      await this.connectMain();
    }

    return this.executeQuery(this.mainDb!, sql, params);
  }

  /**
   * Query a project-specific database
   * 
   * Executes a SQL query on a project's database. Automatically gets or creates
   * the project database connection. Converts PostgreSQL-style parameters to SQLite.
   * 
   * @param {string} projectId - Project ID
   * @param {string} sql - SQL query string
   * @param {unknown[]} [params] - Query parameters
   * @returns {Promise<QueryResult>} Query results with rows and rowCount
   * @throws {Error} If projectId is missing or query fails
   * 
   * @example
   * const result = await manager.queryProject(
   *   'project-uuid',
   *   'SELECT * FROM collections WHERE name = $1',
   *   ['users']
   * );
   */
  async queryProject(
    projectId: string,
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult> {
    const db = await this.getProjectDb(projectId);
    return this.executeQuery(db, sql, params);
  }

  /**
   * Execute a query on a database connection
   */
  private executeQuery(
    db: Database.Database,
    sql: string,
    params?: unknown[]
  ): QueryResult {
    try {
      // Convert PostgreSQL-style parameters ($1, $2, etc.) to SQLite-style (?)
      const { convertedSql, paramMap } = this.convertPostgreSQLParams(sql);
      const reorderedParams = this.reorderParams(params || [], paramMap);

      // Determine query type
      const trimmedSql = convertedSql.trim().toUpperCase();
      
      if (trimmedSql.startsWith("SELECT")) {
        const stmt = db.prepare(convertedSql);
        const rows = stmt.all(...reorderedParams) as Record<string, unknown>[];
        return {
          rows,
          rowCount: rows.length,
        };
      } else {
        // INSERT, UPDATE, DELETE
        const stmt = db.prepare(convertedSql);
        const result = stmt.run(...reorderedParams);
        return {
          rows: result.lastInsertRowid ? [{ id: result.lastInsertRowid }] : [],
          rowCount: result.changes || 0,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`SQLite query error: ${errorMessage}. SQL: ${sql}`);
    }
  }

  /**
   * Convert PostgreSQL-style parameters ($1, $2, etc.) to SQLite-style (?)
   */
  private convertPostgreSQLParams(sql: string): { convertedSql: string; paramMap: number[] } {
    const pgParamRegex = /\$(\d+)/g;
    const matches: number[] = [];
    let match;
    
    while ((match = pgParamRegex.exec(sql)) !== null) {
      const paramIndex = parseInt(match[1], 10);
      if (!matches.includes(paramIndex)) {
        matches.push(paramIndex);
      }
    }

    matches.sort((a, b) => a - b);
    const convertedSql = sql.replace(/\$(\d+)/g, "?");
    return { convertedSql, paramMap: matches };
  }

  /**
   * Reorder parameters according to PostgreSQL parameter order
   */
  private reorderParams(params: unknown[], paramMap: number[]): unknown[] {
    if (!params || params.length === 0) {
      return [];
    }

    const reordered: unknown[] = [];
    for (const index of paramMap) {
      const value = params[index - 1];
      reordered.push(value !== undefined ? value : null);
    }

    return reordered;
  }

  /**
   * Close a project database connection
   */
  async closeProjectDb(projectId: string): Promise<void> {
    const db = this.projectDbs.get(projectId);
    if (db) {
      try {
        db.close();
      } catch {
        // Ignore errors during close
      }
      this.projectDbs.delete(projectId);
    }
  }

  /**
   * Close the main database connection
   */
  async closeMain(): Promise<void> {
    if (this.mainDb) {
      try {
        this.mainDb.close();
      } catch {
        // Ignore errors during close
      }
      this.mainDb = null;
      this.isMainConnected = false;
    }
  }

  /**
   * Close all database connections
   */
  async closeAll(): Promise<void> {
    // Close all project databases
    for (const [_projectId, db] of this.projectDbs.entries()) {
      try {
        db.close();
      } catch {
        // Ignore errors
      }
    }
    this.projectDbs.clear();

    // Close main database
    await this.closeMain();
  }

  /**
   * Get project database file path (for backup/versioning)
   */
  getProjectDbPath(projectId: string): string {
    return path.join(this.projectsDbDir, projectId, "database.db");
  }

  /**
   * Get project folder path (contains database.db and files/)
   */
  getProjectFolderPath(projectId: string): string {
    return path.join(this.projectsDbDir, projectId);
  }

  /**
   * Get project files folder path
   */
  getProjectFilesPath(projectId: string): string {
    return path.join(this.projectsDbDir, projectId, "files");
  }

  /**
   * Check if a project database exists
   */
  projectDbExists(projectId: string): boolean {
    const dbPath = this.getProjectDbPath(projectId);
    return fs.existsSync(dbPath);
  }

  /**
   * List all project database files
   */
  listProjectDbs(): string[] {
    if (!fs.existsSync(this.projectsDbDir)) {
      return [];
    }

    const files = fs.readdirSync(this.projectsDbDir);
    return files
      .filter(file => {
        const projectPath = path.join(this.projectsDbDir, file);
        return fs.statSync(projectPath).isDirectory() && 
               fs.existsSync(path.join(projectPath, "database.db"));
      })
      .map(file => file);
  }
}
