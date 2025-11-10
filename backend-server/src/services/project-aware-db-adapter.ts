/**
 * Project-Aware Database Connection Adapter
 * 
 * Wraps DatabaseService and routes queries to the correct database based on project context.
 * Intelligently routes queries:
 * - Queries to main database tables (admin_users, projects, sessions, api_keys, etc.) -> main DB
 * - Queries to project-specific tables (collections, documents, files, etc.) -> project DB
 * 
 * For project-specific queries, extracts project_id from SQL parameters or uses context object.
 * 
 * @class ProjectAwareDbAdapter
 * @example
 * const adapter = new ProjectAwareDbAdapter(dbService);
 * adapter.setProjectContext('project-id');
 * const result = await adapter.query('SELECT * FROM collections WHERE project_id = $1', ['project-id']);
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
   * 
   * Sets the project ID context that will be used for routing project-specific queries.
   * 
   * @param {string} projectId - Project ID
   * @returns {void}
   * 
   * @example
   * adapter.setProjectContext('project-id');
   * // All subsequent queries will use this project context
   */
  setProjectContext(projectId: string): void {
    this.context.projectId = projectId;
  }

  /**
   * Clear the project context
   * 
   * Clears the current project context, so queries will only go to main database.
   * 
   * @returns {void}
   * 
   * @example
   * adapter.clearProjectContext();
   */
  clearProjectContext(): void {
    delete this.context.projectId;
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
      
      // Pattern 1: WHERE project_id = $X (SELECT, UPDATE, DELETE)
      const projectIdMatches = sqlLower.matchAll(/project_id\s*=\s*\$(\d+)/gi);
      
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
      // Find the position of project_id in the column list
      if (sqlLower.includes("insert into") && sqlLower.includes("project_id")) {
        // Extract column list: INSERT INTO table (col1, col2, project_id, col3)
        const columnListMatch = sqlLower.match(/insert\s+into\s+\w+\s*\(([^)]+)\)/i);
        if (columnListMatch && columnListMatch[1]) {
          const columns = columnListMatch[1].split(",").map(c => c.trim());
          const projectIdIndex = columns.findIndex(col => col === "project_id");
          
          if (projectIdIndex >= 0 && projectIdIndex < params.length) {
            const projectId = params[projectIdIndex];
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

      // Pattern 3: If SQL has project_id in column list but we couldn't extract it,
      // check if any param looks like a project ID (fallback)
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
        } catch {
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
