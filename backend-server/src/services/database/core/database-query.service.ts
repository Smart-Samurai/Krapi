import { DatabaseQueue } from "../../database-queue.service";
import { MultiDatabaseManager } from "../../multi-database-manager.service";

import { DatabaseCoreService } from "./database-core.service";

/**
 * Database Query Service
 * 
 * Handles all database query operations (query, queryMain, queryProject).
 * Manages query queuing and routing.
 */
export class DatabaseQueryService {
  constructor(
    private core: DatabaseCoreService,
    private dbManager: MultiDatabaseManager,
    private queue: DatabaseQueue
  ) {}

  /**
   * Initialize database queue when database is ready
   */
  async initializeQueue(): Promise<void> {
    if (this.core.isQueueInitialized()) {
      return;
    }

    // Create a queue-compatible database connection interface
    const queueDbConnection = {
      query: async (
        sql: string,
        params?: unknown[]
      ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> => {
        // Route based on SQL content
        const dbType = this.determineQueryType(sql);
        if (dbType === "project") {
          const projectId = this.extractProjectId(sql, params);
          if (projectId) {
            return await this.dbManager.queryProject(projectId, sql, params);
          }
        }
        return await this.dbManager.queryMain(sql, params);
      },
    };

    await this.queue.initialize(queueDbConnection);
    this.core.setQueueInitialized(true);
  }

  /**
   * Determine if query is for main or project database
   */
  private determineQueryType(sql: string): "main" | "project" {
    const sqlLower = sql.toLowerCase();
    const projectTables = [
      "collections",
      "documents",
      "files",
      "project_users",
      "changelog",
      "folders",
      "file_permissions",
      "file_versions",
    ];

    for (const table of projectTables) {
      if (
        sqlLower.includes(`from ${table}`) ||
        sqlLower.includes(`into ${table}`) ||
        sqlLower.includes(`update ${table}`) ||
        sqlLower.includes(`delete from ${table}`)
      ) {
        return "project";
      }
    }

    return "main";
  }

  /**
   * Extract project ID from SQL or params
   */
  private extractProjectId(sql: string, params?: unknown[]): string | null {
    if (!params || params.length === 0) {
      return null;
    }

    const sqlLower = sql.toLowerCase();
    const projectIdMatches = sqlLower.matchAll(/project_id\s*=\s*\$\d+/gi);

    for (const match of projectIdMatches) {
      const paramIndexStr = match[0].match(/\$(\d+)/)?.[1];
      if (paramIndexStr) {
        const paramIndex = parseInt(paramIndexStr, 10) - 1;
        if (paramIndex >= 0 && paramIndex < params.length) {
          const projectId = params[paramIndex];
          if (typeof projectId === "string" && projectId.length > 10) {
            return projectId;
          }
        }
      }
    }

    // Fallback: check if any param looks like a UUID
    for (const param of params) {
      if (
        typeof param === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          param
        )
      ) {
        return param;
      }
    }

    return null;
  }

  /**
   * Execute a query on the main database (backward compatibility)
   */
  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    await this.initializeQueue();

    // Enqueue the operation with normal priority
    return await this.queue.enqueue(async (_db) => {
      // For backward compatibility, route to main database
      return await this.dbManager.queryMain(sql, params);
    }, 0);
  }

  /**
   * Query the main database
   */
  async queryMain(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    await this.initializeQueue();

    // Enqueue the operation with normal priority
    return await this.queue.enqueue(async (_db) => {
      return await this.dbManager.queryMain(sql, params);
    }, 0);
  }

  /**
   * Query a project-specific database
   */
  async queryProject(
    projectId: string,
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    if (!projectId) {
      throw new Error("Project ID is required for project database queries");
    }

    await this.initializeQueue();

    // Enqueue the operation with normal priority
    return await this.queue.enqueue(async (_db) => {
      return await this.dbManager.queryProject(projectId, sql, params);
    }, 0);
  }
}








