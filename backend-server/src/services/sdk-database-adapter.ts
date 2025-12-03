/**
 * SDK-Compatible Database Adapter
 * 
 * Implements SDK's DatabaseConnection interface and routes queries to the correct database.
 * Uses SDK's native SQLite support - no PostgreSQL-to-SQLite conversion needed.
 * 
 * Routes queries:
 * - Main database tables (admin_users, projects, sessions, etc.) -> main DB
 * - Project-specific tables (collections, documents, files, etc.) -> project DB
 * 
 * @class SdkDatabaseAdapter
 * @example
 * const adapter = new SdkDatabaseAdapter(mainDbPath, projectsDbDir);
 * await adapter.connect();
 * const result = await adapter.query('SELECT * FROM projects WHERE id = ?', ['project-id']);
 */

import type { DatabaseConnection } from "@smartsamurai/krapi-sdk";

import { MultiDatabaseManager } from "./multi-database-manager.service";

export class SdkDatabaseAdapter implements DatabaseConnection {
  private dbManager: MultiDatabaseManager;
  private isConnected = false;
  
  /**
   * Track the last known project ID for queries that don't include project_id
   * This is needed because SDK sometimes does follow-up queries like:
   * SELECT * FROM project_users WHERE id = $1
   * without including project_id in the WHERE clause
   */
  private lastProjectId: string | null = null;

  /**
   * Main database tables (stored in main DB)
   */
  private readonly MAIN_DB_TABLES = [
    "admin_users",
    "projects",
    "sessions",
    "api_keys",
    "email_templates",
    "system_checks",
    "migrations",
    "activity_logs",
    "storage_quotas", // CRITICAL: SDK's updateStorageUsage queries this table
  ];

  /**
   * Project-specific tables (stored in project DBs)
   */
  private readonly PROJECT_DB_TABLES = [
    "collections",
    "documents",
    "files",
    "project_users",
    "changelog",
    "folders",
    "file_permissions",
    "file_versions",
    "user_activities",
  ];

  /**
   * Create a new SDK database adapter
   * 
   * @param {string} [mainDbPath] - Path to main database (defaults to data/krapi.db)
   * @param {string} [projectsDbDir] - Directory for project databases (defaults to data/projects)
   */
  constructor(mainDbPath?: string, projectsDbDir?: string) {
    this.dbManager = new MultiDatabaseManager(mainDbPath, projectsDbDir);
  }

  /**
   * Extract project ID from SQL parameters
   */
  private extractProjectIdFromParams(
    sql: string,
    params?: unknown[]
  ): string | null {
    if (!params || params.length === 0) {
      return null;
    }

    const sqlLower = sql.toLowerCase();
    
    // Pattern 1: WHERE project_id = $X or WHERE project_id = ?
    const projectIdMatches = sqlLower.matchAll(/project_id\s*=\s*[\$?](\d+)/gi);
    
    for (const match of projectIdMatches) {
      if (!match[1]) continue;
      const paramIndex = parseInt(match[1], 10) - 1;
      if (
        paramIndex >= 0 &&
        paramIndex < params.length &&
        params[paramIndex] &&
        typeof params[paramIndex] === "string"
      ) {
        const projectId = params[paramIndex] as string;
        // Validate it looks like a project ID (UUID or similar)
        if (
          projectId.length > 10 ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            projectId
          )
        ) {
          return projectId;
        }
      }
    }

    // Pattern 2: INSERT INTO table (..., project_id, ...) VALUES (..., $X, ...)
    if (sqlLower.includes("insert into") && sqlLower.includes("project_id")) {
      // Match column list - handle multi-line SQL
      const columnListMatch = sqlLower.match(/insert\s+into\s+\w+\s*\(([^)]+)\)/is);
      if (columnListMatch && columnListMatch[1]) {
        // Split by comma and clean up whitespace/newlines
        const columns = columnListMatch[1]
          .split(",")
          .map(c => c.trim().toLowerCase().replace(/\s+/g, ""));
        const projectIdIndex = columns.findIndex(col => col === "project_id");
        
        // Debug logging for troubleshooting
        if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
          console.log(`[SDK ADAPTER] INSERT columns parsed: ${columns.slice(0, 5).join(", ")}..., project_id index: ${projectIdIndex}, params length: ${params?.length}`);
        }
        
        if (projectIdIndex >= 0 && params && projectIdIndex < params.length) {
          const projectId = params[projectIdIndex];
          if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
            console.log(`[SDK ADAPTER] Extracted project_id from INSERT at index ${projectIdIndex}: ${projectId}`);
          }
          if (
            projectId &&
            typeof projectId === "string" &&
            (projectId.length > 10 ||
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                projectId
              ))
          ) {
            return projectId;
          }
        }
      }
    }

    // Pattern 3: Fallback - check if any param looks like a project ID
    if (sqlLower.includes("project_id")) {
      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        if (
          param &&
          typeof param === "string" &&
          (param.length > 10 ||
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              param
            ))
        ) {
          return param;
        }
      }
    }

    return null;
  }

  /**
   * Determine which database to query based on SQL
   */
  private determineDatabase(
    sql: string,
    params?: unknown[]
  ): "main" | "project" | "unknown" {
    const sqlLower = sql.toLowerCase().trim();

    // Check for main database tables
    for (const table of this.MAIN_DB_TABLES) {
      if (
        sqlLower.includes(`from ${table}`) ||
        sqlLower.includes(`into ${table}`) ||
        sqlLower.includes(`update ${table}`) ||
        sqlLower.includes(`delete from ${table}`) ||
        sqlLower.includes(`insert into ${table}`)
      ) {
        return "main";
      }
    }

    // Check for project-specific tables
    for (const table of this.PROJECT_DB_TABLES) {
      if (
        sqlLower.includes(`from ${table}`) ||
        sqlLower.includes(`into ${table}`) ||
        sqlLower.includes(`update ${table}`) ||
        sqlLower.includes(`delete from ${table}`) ||
        sqlLower.includes(`insert into ${table}`) ||
        sqlLower.includes(`create table ${table}`) ||
        sqlLower.includes(`alter table ${table}`)
      ) {
        // Try to extract project ID
        const projectId = this.extractProjectIdFromParams(sql, params);
        if (projectId) {
          return "project";
        }
        return "unknown";
      }
    }

    // Default to main database for unknown queries
    return "main";
  }

  /**
   * Execute query, routing to appropriate database
   * 
   * SDK handles SQLite natively - no conversion needed.
   * 
   * @param {string} sql - SQL query string
   * @param {unknown[]} [params] - Query parameters
   * @returns {Promise<{ rows: unknown[]; rowCount: number }>} Query results
   */
  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: unknown[]; rowCount: number }> {
    const dbType = this.determineDatabase(sql, params);
    let projectId = this.extractProjectIdFromParams(sql, params);
    
    // If we found a project ID, remember it for subsequent queries
    if (projectId) {
      this.lastProjectId = projectId;
    }

    // Debug logging for project-specific tables
    const sqlLower = sql.toLowerCase();
    if (sqlLower.includes("project_users")) {
      if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
        console.log(`[SDK ADAPTER] project_users query detected:`);
      }
      console.log(`  - DB Type: ${dbType}`);
      console.log(`  - Project ID: ${projectId}`);
      console.log(`  - Last Known Project ID: ${this.lastProjectId}`);
      console.log(`  - SQL: ${sql.substring(0, 150)}...`);
      console.log(`  - Params (first 3): ${JSON.stringify(params?.slice(0, 3))}`);
    }

    if (dbType === "project") {
      if (projectId) {
        return await this.dbManager.queryProject(projectId, sql, params);
      } else if (this.lastProjectId) {
        // Use last known project ID for follow-up queries that don't include project_id
        if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
          console.log(`[SDK ADAPTER] Using last known project ID ${this.lastProjectId} for query without project_id`);
        }
        return await this.dbManager.queryProject(this.lastProjectId, sql, params);
      } else {
        // If we can't determine project ID, try main database as fallback
        console.warn(
          `Warning: Could not determine project ID for project-specific query, routing to main database as fallback. SQL:`,
          sql.substring(0, 200)
        );
        try {
          return await this.dbManager.queryMain(sql, params);
        } catch {
          throw new Error(
            `Could not determine project ID for project-specific query and main database query failed. ` +
            `Please ensure project_id is included in query parameters. SQL: ${sql.substring(0, 200)}`
          );
        }
      }
    } else if (dbType === "main") {
      return await this.dbManager.queryMain(sql, params);
    } else {
      // Unknown query type - check if we have a project ID anyway
      if (projectId) {
        if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
          console.log(`[SDK ADAPTER] Unknown query type but found project ID ${projectId}, routing to project DB`);
        }
        return await this.dbManager.queryProject(projectId, sql, params);
      } else if (this.lastProjectId) {
        // For unknown query types on project tables, use last known project ID
        // Check if this is a project table query
        const isProjectTable = this.PROJECT_DB_TABLES.some(table => sqlLower.includes(table));
        if (isProjectTable) {
          if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
            console.log(`[SDK ADAPTER] Unknown query on project table, using last known project ID ${this.lastProjectId}`);
          }
          return await this.dbManager.queryProject(this.lastProjectId, sql, params);
        }
      }
      // Default to main database
      return await this.dbManager.queryMain(sql, params);
    }
  }

  /**
   * Connect to database
   * 
   * @returns {Promise<void>}
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    await this.dbManager.connectMain();
    this.isConnected = true;
  }

  /**
   * Close database connection
   * 
   * @returns {Promise<void>}
   */
  async end(): Promise<void> {
    // MultiDatabaseManager doesn't have a close method, but we can mark as disconnected
    this.isConnected = false;
  }
}

