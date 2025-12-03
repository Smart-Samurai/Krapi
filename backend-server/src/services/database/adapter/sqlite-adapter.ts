import Database from "better-sqlite3";

/**
 * SQLite Database Adapter
 *
 * Provides low-level SQLite database operations including connection management,
 * query execution, transaction handling, and database schema operations.
 * Uses better-sqlite3 for synchronous operations with better performance.
 */
export class SQLiteAdapter {
  private db: Database.Database | null = null;
  private connected = false;
  private _dbPath: string | null = null;

  /** Check if database is connected */
  get isConnected(): boolean {
    return this.connected;
  }

  /** Get the database path */
  get dbPath(): string | null {
    return this._dbPath;
  }

  /**
   * Connect to SQLite database
   *
   * @param {string} databasePath - Path to database file
   */
  async connect(databasePath: string): Promise<void> {
    try {
      this.db = new Database(databasePath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("busy_timeout = 5000");
      this.connected = true;
      this._dbPath = databasePath;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.db && this.connected) {
      this.db.close();
      this.connected = false;
      this.db = null;
    }
  }

  /**
   * Execute SQL query
   *
   * @param {string} sql - SQL query
   * @param {unknown[]} params - Query parameters
   * @returns {Record<string, unknown>[]} Query results
   */
  async query(
    sql: string,
    params: unknown[] = []
  ): Promise<Record<string, unknown>[]> {
    if (!this.db || !this.connected) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    return rows as Record<string, unknown>[];
  }

  /**
   * Execute SQL query and return first result
   *
   * @param {string} sql - SQL query
   * @param {unknown[]} params - Query parameters
   * @returns {Record<string, unknown> | null} First result or null
   */
  async queryOne(
    sql: string,
    params: unknown[] = []
  ): Promise<Record<string, unknown> | null> {
    if (!this.db || !this.connected) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    return (row as Record<string, unknown>) || null;
  }

  /**
   * Execute SQL statement (INSERT, UPDATE, DELETE)
   *
   * @param {string} sql - SQL statement
   * @param {unknown[]} params - Statement parameters
   * @returns {{ changes: number; lastID: number }} Execution result
   */
  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastID: number }> {
    if (!this.db || !this.connected) {
      throw new Error("Database not connected");
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return { changes: result.changes, lastID: Number(result.lastInsertRowid) };
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<void> {
    if (!this.db || !this.connected) {
      throw new Error("Database not connected");
    }
    this.db.exec("BEGIN TRANSACTION");
  }

  /**
   * Commit transaction
   */
  async commitTransaction(): Promise<void> {
    if (!this.db || !this.connected) {
      throw new Error("Database not connected");
    }
    this.db.exec("COMMIT");
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.db || !this.connected) {
      throw new Error("Database not connected");
    }
    this.db.exec("ROLLBACK");
  }

  /**
   * Check if connected
   *
   * @returns {boolean} Connection status
   */
  checkConnected(): boolean {
    return this.connected;
  }

  /**
   * Get database instance (for advanced operations)
   *
   * @returns {Database.Database | null} Database instance
   */
  getDatabase(): Database.Database | null {
    return this.db;
  }
}
