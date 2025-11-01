/**
 * SQLite Database Adapter Service
 * 
 * Adapter that wraps better-sqlite3 to provide a PostgreSQL-compatible
 * interface for the KRAPI backend. This allows the application to use
 * an embedded SQLite database instead of requiring a separate PostgreSQL
 * server instance.
 */

// @ts-ignore - better-sqlite3 types may not be available during build
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

/**
 * SQLite Adapter that provides PostgreSQL-compatible interface
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
  getDatabase(): Database.Database | null {
    return this.db;
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected && this.db !== null;
  }

  /**
   * Execute a raw SQL statement (for migrations, etc.)
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
  getDbPath(): string {
    return this.dbPath;
  }
}

