import { DatabaseConnectionManager } from './database/adapter/database-connection-manager';
import { DatabaseHealthChecker } from './database/adapter/database-health-checker';
import { DatabaseQueryExecutor } from './database/adapter/database-query-executor';
import { DatabaseSchemaManager } from './database/adapter/database-schema-manager';

/**
 * Database Adapter Service
 * 
 * Provides unified database operations through specialized adapter components.
 * This service now delegates to focused classes for better organization and maintainability.
 */
export class DatabaseAdapterService {
  private connectionManager: DatabaseConnectionManager;
  private mainExecutor: DatabaseQueryExecutor | null = null;
  private projectExecutors = new Map<string, DatabaseQueryExecutor>();
  private schemaManager: DatabaseSchemaManager | null = null;
  private healthChecker: DatabaseHealthChecker | null = null;

  constructor(dataDir = './data') {
    this.connectionManager = new DatabaseConnectionManager(dataDir);
  }

  /**
   * Get main database executor
   */
  async getMainExecutor(): Promise<DatabaseQueryExecutor> {
    if (!this.mainExecutor) {
      const adapter = await this.connectionManager.getMainAdapter();
      this.mainExecutor = new DatabaseQueryExecutor(adapter);
    }
    return this.mainExecutor;
  }

  /**
   * Get project database executor
   */
  async getProjectExecutor(projectId: string): Promise<DatabaseQueryExecutor> {
    if (!this.projectExecutors.has(projectId)) {
      const adapter = await this.connectionManager.getProjectAdapter(projectId);
      const executor = new DatabaseQueryExecutor(adapter);
      this.projectExecutors.set(projectId, executor);
    }
    return this.projectExecutors.get(projectId)!;
  }

  /**
   * Get schema manager
   */
  async getSchemaManager(): Promise<DatabaseSchemaManager> {
    if (!this.schemaManager) {
      const executor = await this.getMainExecutor();
      this.schemaManager = new DatabaseSchemaManager(executor);
    }
    return this.schemaManager;
  }

  /**
   * Get health checker
   */
  async getHealthChecker(): Promise<DatabaseHealthChecker> {
    if (!this.healthChecker) {
      const executor = await this.getMainExecutor();
      this.healthChecker = new DatabaseHealthChecker(executor);
    }
    return this.healthChecker;
  }

  /**
   * Execute query on main database
   */
  async query(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    const executor = await this.getMainExecutor();
    return executor.select(sql, params);
  }

  /**
   * Execute query on project database
   */
  async queryProject(projectId: string, sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    const executor = await this.getProjectExecutor(projectId);
    return executor.select(sql, params);
  }

  /**
   * Execute query and return first result from main database
   */
  async queryOne(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | null> {
    const executor = await this.getMainExecutor();
    return executor.selectOne(sql, params);
  }

  /**
   * Execute query and return first result from project database
   */
  async queryProjectOne(projectId: string, sql: string, params: unknown[] = []): Promise<Record<string, unknown> | null> {
    const executor = await this.getProjectExecutor(projectId);
    return executor.selectOne(sql, params);
  }

  /**
   * Execute statement on main database
   */
  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number; lastID: number }> {
    const executor = await this.getMainExecutor();
    return executor.execute(sql, params);
  }

  /**
   * Execute statement on project database
   */
  async executeProject(projectId: string, sql: string, params: unknown[] = []): Promise<{ changes: number; lastID: number }> {
    const executor = await this.getProjectExecutor(projectId);
    return executor.execute(sql, params);
  }

  /**
   * Execute in transaction on main database
   */
  async executeInTransaction<T>(
    operation: (executor: DatabaseQueryExecutor) => Promise<T>
  ): Promise<T> {
    const executor = await this.getMainExecutor();
    return executor.executeInTransaction(operation);
  }

  /**
   * Execute in transaction on project database
   */
  async executeProjectInTransaction<T>(
    projectId: string,
    operation: (executor: DatabaseQueryExecutor) => Promise<T>
  ): Promise<T> {
    const executor = await this.getProjectExecutor(projectId);
    return executor.executeInTransaction(operation);
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    await this.connectionManager.closeAllConnections();
    this.mainExecutor = null;
    this.projectExecutors.clear();
    this.schemaManager = null;
    this.healthChecker = null;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { main: boolean; projects: Record<string, boolean> } {
    return this.connectionManager.getConnectionStatus();
  }

  // Schema management methods - delegate to schema manager
  async createTable(tableName: string, schema: string): Promise<void> {
    const schemaManager = await this.getSchemaManager();
    return schemaManager.createTable(tableName, schema);
  }

  async dropTable(tableName: string): Promise<void> {
    const schemaManager = await this.getSchemaManager();
    return schemaManager.dropTable(tableName);
  }

  async addColumn(tableName: string, columnName: string, columnType: string): Promise<void> {
    const schemaManager = await this.getSchemaManager();
    return schemaManager.addColumn(tableName, columnName, columnType);
  }

  async createIndex(tableName: string, indexName: string, columns: string[]): Promise<void> {
    const schemaManager = await this.getSchemaManager();
    return schemaManager.createIndex(tableName, indexName, columns);
  }

  async columnExists(tableName: string, columnName: string): Promise<boolean> {
    const schemaManager = await this.getSchemaManager();
    return schemaManager.columnExists(tableName, columnName);
  }

  async enableForeignKeys(): Promise<void> {
    const schemaManager = await this.getSchemaManager();
    return schemaManager.enableForeignKeys();
  }

  // Health check methods - delegate to health checker
  async runHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: Record<string, unknown>;
  }> {
    const healthChecker = await this.getHealthChecker();
    return healthChecker.runHealthCheck();
  }
}
