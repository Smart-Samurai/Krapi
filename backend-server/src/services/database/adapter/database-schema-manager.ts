import { DatabaseQueryExecutor } from './database-query-executor';

/**
 * Database Schema Manager
 *
 * Handles database schema operations including table creation,
 * index management, and schema migrations.
 */
export class DatabaseSchemaManager {
  constructor(private executor: DatabaseQueryExecutor) {}

  /**
   * Create table with schema
   */
  async createTable(tableName: string, schema: string): Promise<void> {
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`;
    await this.executor.execute(sql);
    console.log(`✅ Created table: ${tableName}`);
  }

  /**
   * Drop table
   */
  async dropTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS ${tableName}`;
    await this.executor.execute(sql);
    console.log(`🗑️ Dropped table: ${tableName}`);
  }

  /**
   * Add column to table
   */
  async addColumn(tableName: string, columnName: string, columnType: string): Promise<void> {
    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
    await this.executor.execute(sql);
    console.log(`➕ Added column ${columnName} to ${tableName}`);
  }

  /**
   * Create index
   */
  async createIndex(tableName: string, indexName: string, columns: string[]): Promise<void> {
    const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns.join(', ')})`;
    await this.executor.execute(sql);
    console.log(`📇 Created index: ${indexName}`);
  }

  /**
   * Drop index
   */
  async dropIndex(indexName: string): Promise<void> {
    const sql = `DROP INDEX IF EXISTS ${indexName}`;
    await this.executor.execute(sql);
    console.log(`🗑️ Dropped index: ${indexName}`);
  }

  /**
   * Check if column exists in table
   */
  async columnExists(tableName: string, columnName: string): Promise<boolean> {
    const schema = await this.executor.getTableSchema(tableName);
    return schema.some(column => column.name === columnName);
  }

  /**
   * Check if index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    const result = await this.executor.selectOne(
      "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
      [indexName]
    );
    return !!result;
  }

  /**
   * Get foreign key constraints
   */
  async getForeignKeys(tableName: string): Promise<Record<string, unknown>[]> {
    return this.executor.select(`PRAGMA foreign_key_list(${tableName})`);
  }

  /**
   * Enable foreign keys
   */
  async enableForeignKeys(): Promise<void> {
    await this.executor.execute('PRAGMA foreign_keys = ON');
    console.log('🔗 Foreign keys enabled');
  }

  /**
   * Disable foreign keys
   */
  async disableForeignKeys(): Promise<void> {
    await this.executor.execute('PRAGMA foreign_keys = OFF');
    console.log('🔗 Foreign keys disabled');
  }

  /**
   * Run database migration
   */
  async runMigration(migration: { up: string[]; down: string[] }, direction: 'up' | 'down' = 'up'): Promise<void> {
    const queries = direction === 'up' ? migration.up : migration.down;

    for (const query of queries) {
      if (query.trim()) {
        await this.executor.execute(query);
      }
    }

    console.log(`🚀 Migration ${direction} completed`);
  }

  /**
   * Vacuum database
   */
  async vacuum(): Promise<void> {
    await this.executor.execute('VACUUM');
    console.log('🧹 Database vacuumed');
  }

  /**
   * Analyze database
   */
  async analyze(): Promise<void> {
    await this.executor.execute('ANALYZE');
    console.log('📊 Database analyzed');
  }
}




