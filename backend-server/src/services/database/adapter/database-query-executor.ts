import { SQLiteAdapter } from "./sqlite-adapter";

/**
 * Database Query Executor
 *
 * Provides high-level query execution methods with error handling,
 * logging, and query optimization.
 */
export class DatabaseQueryExecutor {
  constructor(private adapter: SQLiteAdapter) {}

  /**
   * Execute SELECT query
   */
  async select(
    sql: string,
    params: unknown[] = []
  ): Promise<Record<string, unknown>[]> {
    try {
      console.log("🔍 [DB QUERY] Executing SELECT:", sql, params);
      const result = await this.adapter.query(sql, params);
      console.log("✅ [DB QUERY] SELECT result count:", result.length);
      return result;
    } catch (error) {
      console.error("❌ [DB QUERY] SELECT error:", error);
      throw error;
    }
  }

  /**
   * Execute SELECT query and return first result
   */
  async selectOne(
    sql: string,
    params: unknown[] = []
  ): Promise<Record<string, unknown> | null> {
    try {
      console.log("🔍 [DB QUERY] Executing SELECT ONE:", sql, params);
      const result = await this.adapter.queryOne(sql, params);
      console.log(
        "✅ [DB QUERY] SELECT ONE result:",
        result ? "found" : "not found"
      );
      return result;
    } catch (error) {
      console.error("❌ [DB QUERY] SELECT ONE error:", error);
      throw error;
    }
  }

  /**
   * Execute INSERT, UPDATE, DELETE query
   */
  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastID: number }> {
    try {
      console.log("🔄 [DB EXECUTE] Executing:", sql, params);
      const result = await this.adapter.execute(sql, params);
      console.log("✅ [DB EXECUTE] Result:", result);
      return result;
    } catch (error) {
      console.error("❌ [DB EXECUTE] Error:", error);
      throw error;
    }
  }

  /**
   * Execute query within transaction
   */
  async executeInTransaction<T>(
    operation: (executor: DatabaseQueryExecutor) => Promise<T>
  ): Promise<T> {
    await this.adapter.beginTransaction();
    try {
      const result = await operation(this);
      await this.adapter.commitTransaction();
      return result;
    } catch (error) {
      try {
        await this.adapter.rollbackTransaction();
        console.error(`[TRANSACTION] Rollback executed due to error: ${error instanceof Error ? error.message : String(error)}`);
      } catch (rollbackError) {
        console.error(`[TRANSACTION] Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
        // Re-throw original error, not rollback error
      }
      throw error;
    }
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.selectOne(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return !!result;
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<Record<string, unknown>[]> {
    return this.select("PRAGMA table_info(?)", [tableName]);
  }

  /**
   * Get all table names
   */
  async getTableNames(): Promise<string[]> {
    const result = await this.select(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    return result.map((row) => (row as Record<string, unknown>).name as string);
  }
}
