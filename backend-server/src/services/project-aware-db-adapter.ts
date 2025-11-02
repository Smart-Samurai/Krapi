/**
 * Project-Aware Database Connection Adapter
 * 
 * This adapter wraps DatabaseService and routes queries to the correct database
 * based on project context. It attempts to intelligently route queries:
 * - Queries to main database tables (admin_users, projects, sessions, api_keys, etc.) -> main DB
 * - Queries to project-specific tables (collections, documents, files, etc.) -> project DB
 * 
 * For project-specific queries, it extracts project_id from the SQL parameters
 * or uses a context object to determine which project database to query.
 */

import { DatabaseService } from "./database.service";

interface QueryContext {
  projectId?: string;
}

export class ProjectAwareDbAdapter {
  private context: QueryContext = {};
  private dbService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.dbService = databaseService;
  }

  /**
   * Set the project context for subsequent queries
   */
  setProjectContext(projectId: string): void {
    this.context.projectId = projectId;
  }

  /**
   * Clear the project context
   */
  clearProjectContext(): void {
    this.context.projectId = undefined;
  }

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
  ];

  /**
   * Extract project ID from SQL parameters
   */
  private extractProjectIdFromParams(
    sql: string,
    params?: unknown[]
  ): string | null {
    // Check context first
    if (this.context.projectId) {
      return this.context.projectId;
    }

    // Try to extract from SQL parameters
    if (params && params.length > 0) {
      const sqlLower = sql.toLowerCase();
      
      // Common patterns: WHERE project_id = $1, WHERE id = $1 AND project_id = $2
      // Find all occurrences of project_id = $X
      const projectIdMatches = sqlLower.matchAll(/project_id\s*=\s*\$(\d+)/gi);
      
      for (const match of projectIdMatches) {
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

      // If SQL has project_id but we didn't find it in parameters,
      // check if first param looks like a project ID (common pattern)
      if (
        sqlLower.includes("project_id") &&
        params[0] &&
        typeof params[0] === "string"
      ) {
        const firstParam = params[0] as string;
        if (
          firstParam.length > 10 ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            firstParam
          )
        ) {
          return firstParam;
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
        // If we can't determine project ID, default to main (will likely fail)
        // This is a fallback - ideally projectId should be provided
        return "unknown";
      }
    }

    // Default to main database for unknown queries
    return "main";
  }

  /**
   * Execute query, routing to appropriate database
   */
  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: unknown[]; rowCount: number }> {
    const dbType = this.determineDatabase(sql, params);

    if (dbType === "project") {
      const projectId = this.extractProjectIdFromParams(sql, params);
      if (projectId) {
        return await this.dbService.queryProject(projectId, sql, params);
      } else {
        // If we can't determine project ID, try main database as fallback
        // This might fail, but it's better than throwing an error immediately
        // Note: Some queries like "SELECT COUNT(*) FROM collections" without WHERE
        // might not have project_id - these are aggregate queries that may need
        // special handling or should be updated to include project_id
        console.warn(
          `Warning: Could not determine project ID for project-specific query (${this.PROJECT_DB_TABLES.join(", ")}), routing to main database as fallback. SQL:`,
          sql.substring(0, 200)
        );
        try {
          return await this.dbService.queryMain(sql, params);
        } catch (error) {
          // If main database query fails, it's likely because the table doesn't exist there
          throw new Error(
            `Could not determine project ID for project-specific query and main database query failed. ` +
            `Please ensure project_id is included in query parameters. SQL: ${sql.substring(0, 200)}`
          );
        }
      }
    } else if (dbType === "main") {
      return await this.dbService.queryMain(sql, params);
    } else {
      // Unknown query type - default to main database
      return await this.dbService.queryMain(sql, params);
    }
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    await this.dbService.connect();
  }

  /**
   * Close database connection
   */
  async end(): Promise<void> {
    await this.dbService.end();
  }
}
