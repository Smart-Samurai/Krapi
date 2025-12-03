import * as fs from "fs/promises";

import { DatabaseConnectionPool } from "./database-connection-pool";
import { ProjectDatabaseManager } from "./project-database-manager";

/**
 * Database Monitor
 *
 * Monitors database health, performance, and provides maintenance operations.
 */
export class DatabaseMonitor {
  constructor(
    private connectionPool: DatabaseConnectionPool,
    private projectManager: ProjectDatabaseManager
  ) {}

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    connectionPool: unknown;
    projects: string[];
    mainDb: {
      size: number;
      tables: number;
    };
  }> {
    const projects = await this.projectManager.listProjectDatabases();
    const poolStats = this.connectionPool.getStats();

    // Get main database info
    const mainDbStats = await this.getMainDatabaseStats();

    return {
      connectionPool: poolStats,
      projects,
      mainDb: mainDbStats,
    };
  }

  /**
   * Perform database maintenance
   */
  async performMaintenance(): Promise<void> {
    // Clean up connection pool
    this.connectionPool.cleanup();

    // Vacuum main database
    await this.vacuumMainDatabase();

    // Vacuum project databases
    const projects = await this.projectManager.listProjectDatabases();
    for (const projectId of projects) {
      await this.vacuumProjectDatabase(projectId);
    }

    // Analyze databases
    await this.analyzeMainDatabase();
    for (const projectId of projects) {
      await this.analyzeProjectDatabase(projectId);
    }
  }

  /**
   * Get main database statistics
   */
  private async getMainDatabaseStats(): Promise<{
    size: number;
    tables: number;
  }> {
    try {
      // Get database file size
      const stats = await fs.stat("./data/krapi.db");
      const size = stats.size;

      // Get table count
      const result = await this.query(
        'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"'
      );
      const firstRow = result[0] as Record<string, unknown> | undefined;
      const tables = (firstRow?.count as number) || 0;

      return { size, tables };
    } catch {
      return { size: 0, tables: 0 };
    }
  }

  /**
   * Vacuum main database
   */
  private async vacuumMainDatabase(): Promise<void> {
    try {
      await this.execute("VACUUM");
      console.log("🧹 Vacuumed main database");
    } catch (error) {
      console.error("Failed to vacuum main database:", error);
    }
  }

  /**
   * Vacuum project database
   */
  private async vacuumProjectDatabase(projectId: string): Promise<void> {
    try {
      await this.executeProject(projectId, "VACUUM");
      console.log(`🧹 Vacuumed project database: ${projectId}`);
    } catch (error) {
      console.error(`Failed to vacuum project database ${projectId}:`, error);
    }
  }

  /**
   * Analyze main database
   */
  private async analyzeMainDatabase(): Promise<void> {
    try {
      await this.execute("ANALYZE");
      console.log("📊 Analyzed main database");
    } catch (error) {
      console.error("Failed to analyze main database:", error);
    }
  }

  /**
   * Analyze project database
   */
  private async analyzeProjectDatabase(projectId: string): Promise<void> {
    try {
      await this.executeProject(projectId, "ANALYZE");
      console.log(`📊 Analyzed project database: ${projectId}`);
    } catch (error) {
      console.error(`Failed to analyze project database ${projectId}:`, error);
    }
  }

  // Helper methods that delegate to connection pool
  private async query(
    sql: string,
    params: unknown[] = []
  ): Promise<Record<string, unknown>[]> {
    const executor = await this.connectionPool.getConnection("./data/krapi.db");
    try {
      return await executor.select(sql, params);
    } finally {
      this.connectionPool.releaseConnection("./data/krapi.db");
    }
  }

  private async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastID: number }> {
    const executor = await this.connectionPool.getConnection("./data/krapi.db");
    try {
      return await executor.execute(sql, params);
    } finally {
      this.connectionPool.releaseConnection("./data/krapi.db");
    }
  }

  private async executeProject(
    projectId: string,
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastID: number }> {
    const dbPath = `./data/projects/${projectId}.db`;
    const executor = await this.connectionPool.getConnection(dbPath);
    try {
      return await executor.execute(sql, params);
    } finally {
      this.connectionPool.releaseConnection(dbPath);
    }
  }
}
