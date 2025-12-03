/**
 * Multi-Database Manager Service
 *
 * Manages multiple SQLite databases for KRAPI:
 * - Main database: admin users, projects, sessions, global settings
 * - Project databases: collections, documents, files, project-specific data
 *
 * Each project gets its own isolated SQLite database for better performance
 * and data isolation.
 *
 * @module services/multi-database-manager
 */

import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";

/**
 * Multi-Database Manager
 *
 * Manages multiple SQLite database connections.
 * Provides methods to get/create project-specific databases.
 *
 * @class MultiDatabaseManager
 */
export class MultiDatabaseManager {
  private mainDb: Database.Database | null = null;
  private projectDbs: Map<string, Database.Database> = new Map();
  private mainDbPath: string;
  private projectsDbDir: string;
  private isConnected = false;

  /**
   * Fields that are stored as JSON strings in SQLite
   * These need to be parsed when reading from database
   */
  private readonly JSON_FIELDS = [
    'permissions',
    'metadata',
    'settings',
    'data',
    'schema',
    'config',
    'options',
    'scopes',
    'allowed_scopes',
  ];

  /**
   * Serialize parameters for SQLite
   * SQLite can only bind: numbers, strings, bigints, buffers, and null
   * Arrays and objects need to be JSON stringified
   * 
   * @param {unknown[]} params - Parameters to serialize
   * @returns {unknown[]} Serialized parameters safe for SQLite binding
   */
  private serializeParams(params?: unknown[]): unknown[] | undefined {
    if (!params) return undefined;
    
    return params.map(param => {
      // Handle null/undefined
      if (param === null || param === undefined) {
        return null;
      }
      
      // Handle primitives that SQLite can bind directly
      if (typeof param === 'number' || typeof param === 'string' || typeof param === 'bigint') {
        return param;
      }
      
      // Handle Buffer
      if (Buffer.isBuffer(param)) {
        return param;
      }
      
      // Handle boolean - convert to integer (SQLite doesn't have native boolean)
      if (typeof param === 'boolean') {
        return param ? 1 : 0;
      }
      
      // Handle Date - convert to ISO string
      if (param instanceof Date) {
        return param.toISOString();
      }
      
      // Handle arrays and objects - JSON stringify
      if (Array.isArray(param) || (typeof param === 'object' && param !== null)) {
        return JSON.stringify(param);
      }
      
      // For any other type, try to convert to string
      return String(param);
    });
  }

  /**
   * Deserialize JSON fields in query results
   * Parses JSON strings back to arrays/objects for known JSON columns
   * 
   * @param {Record<string, unknown>[]} rows - Query result rows
   * @returns {Record<string, unknown>[]} Rows with JSON fields parsed
   */
  private deserializeRows(rows: unknown[]): unknown[] {
    return rows.map(row => {
      if (typeof row !== 'object' || row === null) {
        return row;
      }
      
      const result = { ...row as Record<string, unknown> };
      
      for (const field of this.JSON_FIELDS) {
        if (field in result && typeof result[field] === 'string') {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(result[field] as string);
            result[field] = parsed;
          } catch {
            // Not valid JSON, keep as string
          }
        }
      }
      
      return result;
    });
  }

  /**
   * Create a new MultiDatabaseManager instance
   *
   * @param {string} [mainDbPath] - Path to main database (defaults to data/krapi.db)
   * @param {string} [projectsDbDir] - Directory for project databases (defaults to data/projects)
   */
  constructor(mainDbPath?: string, projectsDbDir?: string) {
    this.mainDbPath =
      mainDbPath || path.join(process.cwd(), "data", "krapi.db");
    this.projectsDbDir =
      projectsDbDir || path.join(process.cwd(), "data", "projects");

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const mainDir = path.dirname(this.mainDbPath);
    if (!fs.existsSync(mainDir)) {
      fs.mkdirSync(mainDir, { recursive: true });
    }
    if (!fs.existsSync(this.projectsDbDir)) {
      fs.mkdirSync(this.projectsDbDir, { recursive: true });
    }
  }

  /**
   * Connect to the main database
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.mainDb = new Database(this.mainDbPath);
      // Performance optimizations: WAL mode, cache size, synchronous mode
      this.mainDb.pragma("journal_mode = WAL");
      this.mainDb.pragma("busy_timeout = 5000");
      // Increase cache size to 64MB for better performance
      this.mainDb.pragma("cache_size = -64000");
      // Use NORMAL synchronous mode for better performance (WAL mode makes this safe)
      if (process.env.NODE_ENV === "development") {
        this.mainDb.pragma("synchronous = NORMAL");
        this.mainDb.pragma("temp_store = MEMORY");
      }
      this.isConnected = true;
      console.log(`📂 Connected to main database: ${this.mainDbPath}`);
    } catch (error) {
      console.error("Failed to connect to main database:", error);
      throw error;
    }
  }

  /**
   * Get the main database connection
   */
  getMainDb(): Database.Database {
    if (!this.mainDb) {
      // Auto-connect if not connected
      this.mainDb = new Database(this.mainDbPath);
      this.mainDb.pragma("journal_mode = WAL");
      this.mainDb.pragma("busy_timeout = 5000");
      this.isConnected = true;
    }
    return this.mainDb;
  }

  /**
   * Get or create a project database
   *
   * @param {string} projectId - Project ID
   * @returns {Database.Database} Project database connection
   */
  getProjectDb(projectId: string): Database.Database {
    // Check cache first
    if (this.projectDbs.has(projectId)) {
      const db = this.projectDbs.get(projectId);
      if (db) {
        // Always check and fix missing columns when accessing existing database
        this.fixProjectUsersTableColumns(db);
        return db;
      }
    }

    // Create new connection
    const dbPath = path.join(this.projectsDbDir, `${projectId}.db`);
    const isNewDb = !fs.existsSync(dbPath);
    const db = new Database(dbPath);
    // Performance optimizations: WAL mode, cache size, synchronous mode
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    // Increase cache size to 64MB for better performance
    db.pragma("cache_size = -64000");
    // Use NORMAL synchronous mode for better performance (WAL mode makes this safe)
    if (process.env.NODE_ENV === "development") {
      db.pragma("synchronous = NORMAL");
      db.pragma("temp_store = MEMORY");
    }

    this.projectDbs.set(projectId, db);

    // Initialize tables for new databases
    if (isNewDb) {
      this.initializeProjectDbSync(db, projectId);
    } else {
      // For existing databases, fix missing columns
      this.fixProjectUsersTableColumns(db);
    }

    return db;
  }

  /**
   * Synchronously initialize project database tables
   * Called when a new project database is created
   */
  private initializeProjectDbSync(
    db: Database.Database,
    projectId: string
  ): void {
    // Create collections table
    // SDK expects: id, project_id, name, description, fields (JSON), indexes (JSON), created_at, updated_at, created_by
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        fields TEXT DEFAULT '[]',
        indexes TEXT DEFAULT '[]',
        schema TEXT DEFAULT '{}',
        settings TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        created_by TEXT,
        UNIQUE(project_id, name)
      )
    `);

    // Create documents table
    // Note: collection_name is nullable to support SDK which doesn't set it
    // We can derive it from collection_id if needed
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        collection_id TEXT,
        collection_name TEXT,
        project_id TEXT NOT NULL,
        data TEXT DEFAULT '{}',
        version INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      )
    `);

    // Create project_users table
    // SDK expects: id, project_id, username, email, external_id, first_name, last_name,
    // display_name, avatar_url, role, permissions, metadata, password_hash, created_by,
    // created_at, updated_at, is_active
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_users (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        username TEXT NOT NULL,
        email TEXT,
        external_id TEXT,
        first_name TEXT,
        last_name TEXT,
        display_name TEXT,
        avatar_url TEXT,
        role TEXT DEFAULT 'user',
        permissions TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        password_hash TEXT,
        password TEXT,
        created_by TEXT,
        status TEXT DEFAULT 'active',
        is_active INTEGER DEFAULT 1,
        login_count INTEGER DEFAULT 0,
        phone TEXT,
        is_verified INTEGER DEFAULT 0,
        scopes TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_login TEXT,
        UNIQUE(project_id, username),
        UNIQUE(project_id, email)
      )
    `);

    // Create files table - SDK requires specific column names
    // CRITICAL: SDK inserts 'filename' but not 'name', so 'name' must be nullable or have a default
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        folder_id TEXT,
        name TEXT,
        filename TEXT,
        original_name TEXT,
        path TEXT,
        file_path TEXT,
        mime_type TEXT,
        size INTEGER DEFAULT 0,
        file_size INTEGER,
        file_extension TEXT,
        storage_provider TEXT DEFAULT 'local',
        storage_path TEXT,
        storage_url TEXT,
        is_public INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        created_by TEXT,
        uploaded_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create file_versions table
    // SDK expects: id, file_id, version_number, file_name, file_path, file_size, file_hash, storage_path, uploaded_by, is_current
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_versions (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        file_name TEXT,
        file_path TEXT,
        file_size INTEGER,
        file_hash TEXT,
        storage_path TEXT,
        uploaded_by TEXT,
        is_current INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )
    `);

    // Create changelog table
    db.exec(`
      CREATE TABLE IF NOT EXISTS changelog (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        entity_type TEXT,
        entity_id TEXT,
        performed_by TEXT,
        session_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create project-level api_keys table
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        name TEXT,
        type TEXT DEFAULT 'project',
        project_id TEXT NOT NULL,
        owner_id TEXT,
        scopes TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_used TEXT
      )
    `);

    // Create user_activities table for logging user actions
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT DEFAULT '{}',
        metadata TEXT DEFAULT '{}',
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Migration: Add details column to user_activities if it doesn't exist
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(user_activities)`).all();
      const columns = (tableInfo as Array<{ name: string }>).map((row) => row.name);
      if (!columns.includes("details")) {
        db.exec(`
          ALTER TABLE user_activities 
          ADD COLUMN details TEXT DEFAULT '{}'
        `);
      }
    } catch (error) {
      // Table might not exist yet, which is fine - it will be created with the column
      if (error instanceof Error && !error.message.includes("no such table")) {
        console.warn("⚠️  Failed to add details column to user_activities:", error.message);
      }
    }

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_collections_project ON collections(project_id);
      CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection_id);
      CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_users_project ON project_users(project_id);
      CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
      CREATE INDEX IF NOT EXISTS idx_changelog_project ON changelog(project_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
      CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_project ON user_activities(project_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_action ON user_activities(action);
      CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_project_timestamp ON user_activities(project_id, created_at DESC);
    `);

    console.log(`📁 Initialized project database: ${projectId}`);
  }

  /**
   * Initialize a project database with required tables
   *
   * @param {string} projectId - Project ID
   */
  async initializeProjectDatabase(projectId: string): Promise<void> {
    const db = this.getProjectDb(projectId);

    // Create collections table
    // SDK expects: id, project_id, name, description, fields (JSON), indexes (JSON), created_at, updated_at, created_by
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        fields TEXT DEFAULT '[]',
        indexes TEXT DEFAULT '[]',
        schema TEXT DEFAULT '{}',
        settings TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        created_by TEXT,
        UNIQUE(project_id, name)
      )
    `);

    // Create documents table
    // Note: collection_name is nullable to support SDK which doesn't set it
    // We can derive it from collection_id if needed
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        collection_id TEXT,
        collection_name TEXT,
        project_id TEXT NOT NULL,
        data TEXT DEFAULT '{}',
        version INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        status TEXT DEFAULT 'active',
        metadata TEXT DEFAULT '{}'
      )
    `);

    // Create project_users table
    // SDK expects: id, project_id, username, email, external_id, first_name, last_name,
    // display_name, avatar_url, role, permissions, metadata, password_hash, created_by,
    // created_at, updated_at, is_active
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_users (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        username TEXT NOT NULL,
        email TEXT,
        external_id TEXT,
        first_name TEXT,
        last_name TEXT,
        display_name TEXT,
        avatar_url TEXT,
        role TEXT DEFAULT 'user',
        permissions TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        password_hash TEXT,
        password TEXT,
        created_by TEXT,
        status TEXT DEFAULT 'active',
        is_active INTEGER DEFAULT 1,
        login_count INTEGER DEFAULT 0,
        phone TEXT,
        is_verified INTEGER DEFAULT 0,
        scopes TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_login TEXT,
        UNIQUE(project_id, username),
        UNIQUE(project_id, email)
      )
    `);

    // Create files table - SDK requires specific column names
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        filename TEXT,
        original_name TEXT,
        path TEXT NOT NULL,
        file_path TEXT,
        size INTEGER DEFAULT 0,
        file_size INTEGER,
        file_extension TEXT,
        mime_type TEXT,
        folder_id TEXT,
        storage_provider TEXT DEFAULT 'local',
        storage_path TEXT,
        storage_url TEXT,
        is_public INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        created_by TEXT,
        uploaded_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create changelog table
    db.exec(`
      CREATE TABLE IF NOT EXISTS changelog (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        version TEXT,
        action TEXT NOT NULL,
        changes TEXT DEFAULT '{}',
        user_id TEXT,
        resource_type TEXT,
        resource_id TEXT,
        entity_type TEXT,
        entity_id TEXT,
        performed_by TEXT,
        session_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create project-level api_keys table
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        name TEXT,
        type TEXT DEFAULT 'project',
        project_id TEXT NOT NULL,
        owner_id TEXT,
        scopes TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_used TEXT
      )
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_collections_project ON collections(project_id);
      CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection_id);
      CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_users_project ON project_users(project_id);
      CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
      CREATE INDEX IF NOT EXISTS idx_changelog_project ON changelog(project_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
    `);

    console.log(`📁 Initialized project database: ${projectId}`);
    
    // Fix missing columns in project_users table for SDK compatibility
    this.fixProjectUsersTableColumns(db);
  }

  /**
   * Fix missing columns in project_users table for SDK compatibility
   * Adds columns that SDK expects but may be missing in existing databases
   */
  private fixProjectUsersTableColumns(db: Database.Database): void {
    try {
      // Get existing columns
      const columns = db.prepare("PRAGMA table_info(project_users)").all() as Array<{ name: string }>;
      const existingColumns = columns.map((col) => col.name);

      // SDK-required columns that may be missing
      const requiredColumns = [
        { name: "external_id", sql: "ALTER TABLE project_users ADD COLUMN external_id TEXT" },
        { name: "first_name", sql: "ALTER TABLE project_users ADD COLUMN first_name TEXT" },
        { name: "last_name", sql: "ALTER TABLE project_users ADD COLUMN last_name TEXT" },
        { name: "display_name", sql: "ALTER TABLE project_users ADD COLUMN display_name TEXT" },
        { name: "avatar_url", sql: "ALTER TABLE project_users ADD COLUMN avatar_url TEXT" },
        { name: "role", sql: "ALTER TABLE project_users ADD COLUMN role TEXT DEFAULT 'user'" },
        { name: "permissions", sql: "ALTER TABLE project_users ADD COLUMN permissions TEXT DEFAULT '[]'" },
        { name: "password_hash", sql: "ALTER TABLE project_users ADD COLUMN password_hash TEXT" },
        { name: "created_by", sql: "ALTER TABLE project_users ADD COLUMN created_by TEXT" },
        { name: "metadata", sql: "ALTER TABLE project_users ADD COLUMN metadata TEXT DEFAULT '{}'" },
      ];

      for (const column of requiredColumns) {
        if (!existingColumns.includes(column.name)) {
          try {
            db.exec(column.sql);
            console.log(`✅ Added missing '${column.name}' column to project_users table`);
          } catch (error) {
            // Ignore duplicate column errors (race condition)
            if (error instanceof Error && !error.message.includes("duplicate column")) {
              console.error(`Failed to add column ${column.name}:`, error);
            }
          }
        }
      }
    } catch (error) {
      // If table doesn't exist yet, that's fine - it will be created with all columns
      if (error instanceof Error && !error.message.includes("no such table")) {
        console.error("Error fixing project_users table columns:", error);
      }
    }
  }

  /**
   * Execute a query on the main database
   *
   * @param {string} sql - SQL query
   * @param {unknown[]} [params] - Query parameters
   * @returns {{ rows: unknown[]; rowCount: number }} Query result
   */
  query(
    sql: string,
    params?: unknown[]
  ): { rows: unknown[]; rowCount: number } {
    const db = this.getMainDb();
    
    // Serialize parameters for SQLite (convert arrays/objects to JSON strings)
    const serializedParams = this.serializeParams(params);
    
    // Convert PostgreSQL-style placeholders ($1, $2, etc.) to SQLite-style (?)
    // Handle ON CONFLICT queries that reuse parameters (e.g., $2, $3 appear twice)
    const placeholderPattern = /\$(\d+)/g;
    const matches = Array.from(sql.matchAll(placeholderPattern));
    const maxPlaceholder = matches.length > 0 
      ? Math.max(...matches.map(m => {
          const num = m[1];
          return num ? parseInt(num, 10) : 0;
        }))
      : 0;
    
    // For ON CONFLICT queries, we need to expand parameters for each ? placeholder
    // Build a map of placeholder positions to parameter indices
    const placeholderMap = new Map<number, number>();
    let placeholderIndex = 0;
    let convertedSql = sql.replace(placeholderPattern, (_match, numStr) => {
      const paramIndex = parseInt(numStr, 10) - 1; // Convert $1 -> index 0
      placeholderMap.set(placeholderIndex++, paramIndex);
      return '?';
    });
    
    // If we have ON CONFLICT and placeholders, expand params array to match all ? placeholders
    if (convertedSql.includes('ON CONFLICT') && maxPlaceholder > 0 && serializedParams) {
      const expandedParams: unknown[] = [];
      for (let i = 0; i < placeholderIndex; i++) {
        const paramIdx = placeholderMap.get(i);
        if (paramIdx !== undefined && paramIdx >= 0 && paramIdx < serializedParams.length) {
          expandedParams.push(serializedParams[paramIdx]);
        } else {
          throw new Error(
            `Invalid parameter index ${paramIdx} for placeholder ${i + 1}. SQL: ${sql.substring(0, 200)}`
          );
        }
      }
      // Use expanded params instead of original
      const stmt = db.prepare(convertedSql);
      if (!stmt) {
        throw new Error(`Failed to prepare SQL statement: ${convertedSql}`);
      }
      const upperSql = convertedSql.trim().toUpperCase();
      const isSelect = upperSql.startsWith("SELECT");
      const hasReturning = upperSql.includes("RETURNING");
      if (isSelect || hasReturning) {
        const rows = stmt.all(expandedParams) as unknown[];
        const deserializedRows = this.deserializeRows(rows);
        return { rows: deserializedRows, rowCount: rows.length };
      } else {
        const result = stmt.run(expandedParams);
        return { rows: [], rowCount: result.changes };
      }
    }
    
    // For non-ON-CONFLICT queries, use standard conversion
    // If we have placeholders but params don't match, that's an error
    if (maxPlaceholder > 0 && (!serializedParams || serializedParams.length !== maxPlaceholder)) {
      throw new Error(
        `Parameter count mismatch: SQL has ${maxPlaceholder} placeholders but ${serializedParams?.length || 0} parameters provided. SQL: ${sql.substring(0, 200)}`
      );
    }
    
    const stmt = db.prepare(convertedSql);

    if (!stmt) {
      throw new Error(`Failed to prepare SQL statement: ${convertedSql}`);
    }

    const upperSql = convertedSql.trim().toUpperCase();
    // Check if this is a SELECT query or has RETURNING clause
    const isSelect = upperSql.startsWith("SELECT");
    const hasReturning = upperSql.includes("RETURNING");

    if (isSelect || hasReturning) {
      // Use all() for SELECT queries and INSERT/UPDATE/DELETE with RETURNING
      // better-sqlite3 expects params as an array
      const rows = serializedParams ? stmt.all(serializedParams) : stmt.all();
      // Deserialize JSON fields in results
      const deserializedRows = this.deserializeRows(rows);
      return { rows: deserializedRows, rowCount: rows.length };
    } else {
      // better-sqlite3 expects params as an array
      const result = serializedParams ? stmt.run(serializedParams) : stmt.run();
      return { rows: [], rowCount: result.changes };
    }
  }

  /**
   * Execute a query on a project database
   *
   * @param {string} projectId - Project ID
   * @param {string} sql - SQL query
   * @param {unknown[]} [params] - Query parameters
   * @returns {Promise<{ rows: Record<string, unknown>[]; rowCount: number }>} Query result
   */
  async queryProject(
    projectId: string,
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    try {
      const db = this.getProjectDb(projectId);
      
      // Serialize parameters for SQLite (convert arrays/objects to JSON strings)
      const serializedParams = this.serializeParams(params);
      
      // Convert PostgreSQL-style placeholders ($1, $2, etc.) to SQLite-style (?)
      // Count placeholders to ensure parameter count matches
      const placeholderPattern = /\$(\d+)/g;
      const matches = Array.from(sql.matchAll(placeholderPattern));
      const maxPlaceholder = matches.length > 0 
        ? Math.max(...matches.map(m => {
            const num = m[1];
            return num ? parseInt(num, 10) : 0;
          }))
        : 0;
      
      // Convert $1, $2, etc. to ?
      let convertedSql = sql.replace(placeholderPattern, '?');
      
      // If we have placeholders but params don't match, that's an error
      if (maxPlaceholder > 0 && (!serializedParams || serializedParams.length !== maxPlaceholder)) {
        throw new Error(
          `Parameter count mismatch: SQL has ${maxPlaceholder} placeholders but ${serializedParams?.length || 0} parameters provided. SQL: ${sql.substring(0, 200)}`
        );
      }
      
      const stmt = db.prepare(convertedSql);

      if (!stmt) {
        throw new Error(`Failed to prepare SQL statement: ${convertedSql}`);
      }

      const upperSql = convertedSql.trim().toUpperCase();
      // Check if this is a SELECT query or has RETURNING clause
      const isSelect = upperSql.startsWith("SELECT");
      const hasReturning = upperSql.includes("RETURNING");

      if (isSelect || hasReturning) {
        // Use all() for SELECT queries and INSERT/UPDATE/DELETE with RETURNING
        // better-sqlite3 expects params as an array
        const rows = serializedParams ? stmt.all(serializedParams) : stmt.all();
        // Deserialize JSON fields in results
        const deserializedRows = this.deserializeRows(rows);
        return {
          rows: deserializedRows as Record<string, unknown>[],
          rowCount: rows.length,
        };
      } else {
        // better-sqlite3 expects params as an array
        const result = serializedParams ? stmt.run(serializedParams) : stmt.run();
        return { rows: [], rowCount: result.changes };
      }
    } catch (error) {
      console.error(`Error querying project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a project database exists
   *
   * @param {string} projectId - Project ID
   * @returns {boolean} Whether the project database exists
   */
  projectDatabaseExists(projectId: string): boolean {
    const dbPath = path.join(this.projectsDbDir, `${projectId}.db`);
    return fs.existsSync(dbPath);
  }

  /**
   * Delete a project database
   *
   * @param {string} projectId - Project ID
   */
  deleteProjectDatabase(projectId: string): void {
    // Close connection if open
    const db = this.projectDbs.get(projectId);
    if (db) {
      db.close();
      this.projectDbs.delete(projectId);
    }

    // Delete file
    const dbPath = path.join(this.projectsDbDir, `${projectId}.db`);
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Also delete WAL and SHM files if they exist
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  }

  /**
   * Get all project IDs that have databases
   *
   * @returns {string[]} Array of project IDs
   */
  getAllProjectIds(): string[] {
    if (!fs.existsSync(this.projectsDbDir)) {
      return [];
    }

    const files = fs.readdirSync(this.projectsDbDir);
    return files
      .filter((file) => file.endsWith(".db"))
      .map((file) => file.replace(".db", ""));
  }

  /**
   * Close all database connections
   */
  close(): void {
    // Close main database
    if (this.mainDb) {
      this.mainDb.close();
      this.mainDb = null;
    }

    // Close all project databases
    for (const [projectId, db] of this.projectDbs) {
      db.close();
      this.projectDbs.delete(projectId);
    }

    this.isConnected = false;
    console.log("🔒 All database connections closed");
  }

  /**
   * Check if connected to main database
   */
  isConnectedToMain(): boolean {
    return this.isConnected && this.mainDb !== null;
  }

  /**
   * Get database statistics
   */
  getStats(): {
    mainDbPath: string;
    projectsDbDir: string;
    connectedProjects: number;
    isConnected: boolean;
  } {
    return {
      mainDbPath: this.mainDbPath,
      projectsDbDir: this.projectsDbDir,
      connectedProjects: this.projectDbs.size,
      isConnected: this.isConnected,
    };
  }

  // ===== Aliases for backward compatibility =====

  /**
   * Query the main database (alias for query())
   *
   * Returns a Promise for async compatibility.
   *
   * @param {string} sql - SQL query
   * @param {unknown[]} [params] - Query parameters
   * @returns {Promise<{ rows: Record<string, unknown>[]; rowCount: number }>} Query result
   */
  async queryMain(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    const result = this.query(sql, params);
    return {
      rows: result.rows as Record<string, unknown>[],
      rowCount: result.rowCount,
    };
  }

  /**
   * Connect to main database (alias for connect())
   */
  async connectMain(): Promise<void> {
    return this.connect();
  }

  /**
   * Close a specific project database
   *
   * @param {string} projectId - Project ID
   */
  closeProjectDb(projectId: string): void {
    const db = this.projectDbs.get(projectId);
    if (db) {
      db.close();
      this.projectDbs.delete(projectId);
    }
  }

  /**
   * Check if project database exists (alias for projectDatabaseExists())
   *
   * @param {string} projectId - Project ID
   * @returns {boolean} Whether the project database exists
   */
  projectDbExists(projectId: string): boolean {
    return this.projectDatabaseExists(projectId);
  }

  /**
   * Get the project folder path
   *
   * When called with a projectId, returns the project-specific folder path.
   * When called without arguments, returns the projects directory path.
   *
   * @param {string} [projectId] - Optional project ID
   * @returns {string} Path to project folder or projects directory
   */
  getProjectFolderPath(projectId?: string): string {
    if (projectId) {
      return path.join(this.projectsDbDir, projectId);
    }
    return this.projectsDbDir;
  }

  /**
   * Get the path to a specific project database
   *
   * @param {string} projectId - Project ID
   * @returns {string} Path to project database file
   */
  getProjectDbPath(projectId: string): string {
    return path.join(this.projectsDbDir, `${projectId}.db`);
  }

  /**
   * List all project database IDs (alias for getAllProjectIds)
   *
   * @returns {string[]} Array of project IDs
   */
  listProjectDbs(): string[] {
    return this.getAllProjectIds();
  }

  /**
   * Get the path to project files directory
   *
   * @param {string} projectId - Project ID
   * @returns {string} Path to project files directory
   */
  getProjectFilesPath(projectId: string): string {
    const filesPath = path.join(this.projectsDbDir, projectId, "files");
    if (!fs.existsSync(filesPath)) {
      fs.mkdirSync(filesPath, { recursive: true });
    }
    return filesPath;
  }
}
