/**
 * SQLite Database Adapter Service
 * 
 * Adapter that wraps better-sqlite3 to provide a PostgreSQL-compatible
 * interface for the KRAPI backend. This allows the application to use
 * an embedded SQLite database instead of requiring a separate PostgreSQL
 * server instance.
 */

// @ts-ignore - better-sqlite3 types may not be available during build
import * as fs from "fs";
import * as path from "path";

import Database from "better-sqlite3";

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

/**
 * SQLite Adapter that provides PostgreSQL-compatible interface
 * 
 * Wraps better-sqlite3 to provide a PostgreSQL-compatible query interface.
 * Automatically converts PostgreSQL-style parameters ($1, $2) to SQLite-style (?).
 * 
 * Features:
 * - PostgreSQL-compatible parameter syntax
 * - Async query interface
 * - Connection management
 * - Automatic parameter conversion
 * 
 * @class SQLiteAdapter
 * @example
 * const adapter = new SQLiteAdapter('data/krapi.db');
 * await adapter.connect();
 * const result = await adapter.query('SELECT * FROM users WHERE id = $1', ['user-id']);
 */
export class SQLiteAdapter {
  private db: Database.Database | null = null;
  private dbPath: string;
  private isConnected = false;

  constructor(dbPath?: string) {
    // Default to krapi.db in the project root
    this.dbPath = dbPath || path.join(process.cwd(), "data", "krapi.db");
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Convert PostgreSQL-style parameters ($1, $2, etc.) to SQLite-style (?)
   */
  private convertPostgreSQLParams(sql: string): { convertedSql: string; paramMap: number[] } {
    // Match PostgreSQL parameters ($1, $2, etc.)
    const pgParamRegex = /\$(\d+)/g;
    const matches: number[] = [];
    let match;
    
    while ((match = pgParamRegex.exec(sql)) !== null) {
      const paramIndex = parseInt(match[1], 10);
      if (!matches.includes(paramIndex)) {
        matches.push(paramIndex);
      }
    }

    // Sort to ensure proper mapping
    matches.sort((a, b) => a - b);

    // Replace $1, $2, etc. with ?
    const convertedSql = sql.replace(/\$(\d+)/g, "?");

    // Create parameter mapping
    const paramMap = matches;

    return { convertedSql, paramMap };
  }

  /**
   * Reorder parameters according to PostgreSQL parameter order
   */
  private reorderParams(params: unknown[], paramMap: number[]): unknown[] {
    if (!params || params.length === 0) {
      return [];
    }

    // Map parameters according to PostgreSQL order
    const reordered: unknown[] = [];
    for (const index of paramMap) {
      // PostgreSQL uses 1-based indexing, array uses 0-based
      const value = params[index - 1];
      // SQLite requires all parameters, use null for undefined values
      reordered.push(value !== undefined ? value : null);
    }

    return reordered;
  }

  /**
   * Execute a query (async wrapper for synchronous better-sqlite3)
   * 
   * Executes a SQL query with optional parameters. Automatically converts
   * PostgreSQL-style parameters ($1, $2) to SQLite-style (?).
   * 
   * @param {string} sql - SQL query string (PostgreSQL-style parameters supported)
   * @param {unknown[]} [params] - Query parameters
   * @returns {Promise<QueryResult>} Query results with rows and rowCount
   * @throws {Error} If database is not connected
   * @throws {Error} If query execution fails
   * 
   * @example
   * const result = await adapter.query('SELECT * FROM users WHERE id = $1', ['user-id']);
   * console.log(result.rows); // Array of matching rows
   */
  async query(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult> {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }

    try {
      // Convert PostgreSQL-style parameters to SQLite-style
      const { convertedSql, paramMap } = this.convertPostgreSQLParams(sql);
      const reorderedParams = params && paramMap.length > 0
        ? this.reorderParams(params, paramMap)
        : params || [];

      // Determine if this is a SELECT query (read) or mutation (write)
      const isSelect = /^\s*(SELECT|WITH|EXPLAIN|PRAGMA)/i.test(convertedSql.trim());

      if (isSelect) {
        // For SELECT queries, use prepare and all
        const stmt = this.db.prepare(convertedSql);
        const rows = stmt.all(...reorderedParams) as Record<string, unknown>[];
        
        return {
          rows: rows || [],
          rowCount: rows ? rows.length : 0,
        };
      } else {
        // For mutations (INSERT, UPDATE, DELETE), use prepare and run
        const stmt = this.db.prepare(convertedSql);
        const result = stmt.run(...reorderedParams);
        
        return {
          rows: [],
          rowCount: result.changes || 0,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`SQLite query error: ${errorMessage}. SQL: ${sql}`);
    }
  }

  /**
   * Connect to the database
   */
  /**
   * Connect to the SQLite database
   * 
   * Establishes connection to the SQLite database file. Enables WAL mode
   * for better concurrency. Safe to call multiple times.
   * 
   * @returns {Promise<void>}
   * @throws {Error} If connection fails
   * 
   * @example
   * await adapter.connect();
   * // Database is now connected
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.db) {
      return;
    }

    try {
      // Open database with WAL mode for better concurrency
      this.db = new Database(this.dbPath, {
        verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
      });

      // Enable foreign keys
      this.db.pragma("foreign_keys = ON");

      // Enable WAL mode for better concurrency
      this.db.pragma("journal_mode = WAL");

      // Set busy timeout to handle concurrent access
      this.db.pragma("busy_timeout = 5000");

      this.isConnected = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to SQLite database: ${errorMessage}`);
    }
  }

  /**
   * Close the database connection
   */
  /**
   * Close database connection
   * 
   * Closes the SQLite database connection and releases resources.
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await adapter.end();
   */
  async end(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isConnected = false;
    }
  }

  /**
   * Get the underlying database instance (for advanced operations)
   */
  /**
   * Get the underlying database instance
   * 
   * Returns the better-sqlite3 Database instance for advanced operations.
   * 
   * @returns {Database.Database | null} Database instance or null if not connected
   * 
   * @example
   * const db = adapter.getDatabase();
   * if (db) {
   *   // Use db for advanced operations
   * }
   */
  getDatabase(): Database.Database | null {
    return this.db;
  }

  /**
   * Check if connected
   */
  /**
   * Check if database is ready
   * 
   * Returns whether the database connection is established and ready.
   * 
   * @returns {boolean} True if connected, false otherwise
   * 
   * @example
   * if (adapter.isReady()) {
   *   // Database is ready for queries
   * }
   */
  isReady(): boolean {
    return this.isConnected && this.db !== null;
  }

  /**
   * Execute a raw SQL statement (for migrations, etc.)
   */
  /**
   * Execute SQL without returning results
   * 
   * Executes SQL statements that don't return data (e.g., CREATE TABLE, ALTER TABLE).
   * 
   * @param {string} sql - SQL statement to execute
   * @returns {Promise<void>}
   * @throws {Error} If database is not connected
   * @throws {Error} If execution fails
   * 
   * @example
   * await adapter.exec('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY)');
   */
  async exec(sql: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }

    try {
      this.db.exec(sql);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`SQLite exec error: ${errorMessage}`);
    }
  }

  /**
   * Get database path
   */
  /**
   * Get database file path
   * 
   * Returns the path to the SQLite database file.
   * 
   * @returns {string} Database file path
   * 
   * @example
   * const path = adapter.getDbPath();
   * console.log(`Database at: ${path}`);
   */
  getDbPath(): string {
    return this.dbPath;
  }
}

