import { DatabaseConnectionPool } from './database-connection-pool';
import { ProjectDatabaseManager } from './project-database-manager';

/**
 * Query Router
 *
 * Routes database queries to the appropriate database (main or project-specific)
 * based on the operation type and parameters.
 */
export class QueryRouter {
  constructor(
    private connectionPool: DatabaseConnectionPool,
    private projectManager: ProjectDatabaseManager,
    private mainDatabasePath: string
  ) {}

  /**
   * Execute query on main database
   */
  async query(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    const executor = await this.connectionPool.getConnection(this.mainDatabasePath);
    try {
      return await executor.select(sql, params);
    } finally {
      this.connectionPool.releaseConnection(this.mainDatabasePath);
    }
  }

  /**
   * Execute query on main database and return first result
   */
  async queryOne(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | null> {
    const executor = await this.connectionPool.getConnection(this.mainDatabasePath);
    try {
      return await executor.selectOne(sql, params);
    } finally {
      this.connectionPool.releaseConnection(this.mainDatabasePath);
    }
  }

  /**
   * Execute statement on main database
   */
  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number; lastID: number }> {
    const executor = await this.connectionPool.getConnection(this.mainDatabasePath);
    try {
      return await executor.execute(sql, params);
    } finally {
      this.connectionPool.releaseConnection(this.mainDatabasePath);
    }
  }

  /**
   * Execute query on project database
   */
  async queryProject(projectId: string, sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    await this.projectManager.ensureProjectDatabase(projectId);
    const dbPath = this.getProjectDatabasePath(projectId);

    const executor = await this.connectionPool.getConnection(dbPath);
    try {
      return await executor.select(sql, params);
    } finally {
      this.connectionPool.releaseConnection(dbPath);
    }
  }

  /**
   * Execute query on project database and return first result
   */
  async queryProjectOne(projectId: string, sql: string, params: unknown[] = []): Promise<Record<string, unknown> | null> {
    await this.projectManager.ensureProjectDatabase(projectId);
    const dbPath = this.getProjectDatabasePath(projectId);

    const executor = await this.connectionPool.getConnection(dbPath);
    try {
      return await executor.selectOne(sql, params);
    } finally {
      this.connectionPool.releaseConnection(dbPath);
    }
  }

  /**
   * Execute statement on project database
   */
  async executeProject(projectId: string, sql: string, params: unknown[] = []): Promise<{ changes: number; lastID: number }> {
    await this.projectManager.ensureProjectDatabase(projectId);
    const dbPath = this.getProjectDatabasePath(projectId);

    const executor = await this.connectionPool.getConnection(dbPath);
    try {
      return await executor.execute(sql, params);
    } finally {
      this.connectionPool.releaseConnection(dbPath);
    }
  }

  /**
   * Execute transaction on main database
   */
  async executeInTransaction<T>(
    operation: (executor: { select: Function; selectOne: Function; execute: Function }) => Promise<T>
  ): Promise<T> {
    const executor = await this.connectionPool.getConnection(this.mainDatabasePath);
    try {
      await executor.execute('BEGIN TRANSACTION');
      const result = await operation(executor);
      await executor.execute('COMMIT');
      return result;
    } catch (error) {
      try {
        await executor.execute('ROLLBACK');
        console.error(`[TRANSACTION] Rollback executed due to error: ${error instanceof Error ? error.message : String(error)}`);
      } catch (rollbackError) {
        console.error(`[TRANSACTION] Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
        // Re-throw original error, not rollback error
      }
      throw error;
    } finally {
      this.connectionPool.releaseConnection(this.mainDatabasePath);
    }
  }

  /**
   * Execute transaction on project database
   */
  async executeProjectInTransaction<T>(
    projectId: string,
    operation: (executor: { select: Function; selectOne: Function; execute: Function }) => Promise<T>
  ): Promise<T> {
    await this.projectManager.ensureProjectDatabase(projectId);
    const dbPath = this.getProjectDatabasePath(projectId);

    const executor = await this.connectionPool.getConnection(dbPath);
    try {
      await executor.execute('BEGIN TRANSACTION');
      const result = await operation(executor);
      await executor.execute('COMMIT');
      return result;
    } catch (error) {
      try {
        await executor.execute('ROLLBACK');
        console.error(`[TRANSACTION] Project ${projectId} rollback executed due to error: ${error instanceof Error ? error.message : String(error)}`);
      } catch (rollbackError) {
        console.error(`[TRANSACTION] Project ${projectId} rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
        // Re-throw original error, not rollback error
      }
      throw error;
    } finally {
      this.connectionPool.releaseConnection(dbPath);
    }
  }

  /**
   * Get project database path
   */
  private getProjectDatabasePath(projectId: string): string {
    return `./data/projects/${projectId}.db`;
  }
}

