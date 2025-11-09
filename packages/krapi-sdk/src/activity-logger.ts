/**
 * Activity Logger
 * 
 * Provides activity logging functionality for tracking user actions and system events.
 * Logs activities to the database with metadata, timestamps, and severity levels.
 * 
 * @module activity-logger
 * @example
 * const logger = new ActivityLogger(dbConnection, console);
 * await logger.log({
 *   user_id: 'user-id',
 *   project_id: 'project-id',
 *   action: 'created',
 *   resource_type: 'document',
 *   resource_id: 'doc-id',
 *   details: { collection: 'users' }
 * });
 */
import { Logger } from "./core";

/**
 * Activity Log Interface
 * 
 * @interface ActivityLog
 * @property {string} id - Log entry ID
 * @property {string} [user_id] - User ID who performed the action
 * @property {string} [project_id] - Project ID
 * @property {string} action - Action performed
 * @property {string} resource_type - Type of resource affected
 * @property {string} [resource_id] - Resource ID
 * @property {Record<string, unknown>} details - Action details
 * @property {string} [ip_address] - IP address
 * @property {string} [user_agent] - User agent
 * @property {Date} timestamp - Action timestamp
 * @property {"info" | "warning" | "error" | "critical"} severity - Log severity
 * @property {Record<string, unknown>} [metadata] - Additional metadata
 */
export interface ActivityLog {
  id: string;
  user_id?: string;
  project_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  severity: "info" | "warning" | "error" | "critical";
  metadata?: Record<string, unknown>;
}

/**
 * Activity Query Interface
 * 
 * @interface ActivityQuery
 * @property {string} [user_id] - Filter by user ID
 * @property {string} [project_id] - Filter by project ID
 * @property {string} [action] - Filter by action
 * @property {string} [resource_type] - Filter by resource type
 * @property {string} [resource_id] - Filter by resource ID
 * @property {string} [severity] - Filter by severity
 * @property {Date} [start_date] - Start date filter
 * @property {Date} [end_date] - End date filter
 * @property {number} [limit] - Maximum number of results
 * @property {number} [offset] - Number of results to skip
 */
export interface ActivityQuery {
  user_id?: string;
  project_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  severity?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Activity Logger Class
 * 
 * Manages activity logging with database persistence.
 * Provides methods for logging activities and querying activity logs.
 * 
 * @class ActivityLogger
 * @example
 * const logger = new ActivityLogger(dbConnection, console);
 * await logger.log({
 *   user_id: 'user-id',
 *   action: 'created',
 *   resource_type: 'document',
 *   details: {}
 * });
 */
export class ActivityLogger {
  private initialized = false;

  constructor(
    private dbConnection: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[] }>;
    },
    private logger: Logger = console
  ) {
    // Don't initialize in constructor - use lazy initialization
  }

  /**
   * Initialize the activity_logs table
   */
  private async initializeActivityTable(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Wait for essential tables to exist first
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        try {
          // Check if admin_users and projects tables exist
          const tablesCheck = await this.dbConnection.query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_name IN ('admin_users', 'projects') AND table_schema = 'public'
          `);

          if (tablesCheck.rows && tablesCheck.rows.length >= 2) {
            break; // Both tables exist, proceed
          }

          // Wait a bit and try again
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
        } catch {
          // Table check failed, wait and try again
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      if (attempts >= maxAttempts) {
        this.logger.warn(
          "Essential tables not found after waiting, skipping activity table creation"
        );
        return;
      }

      // First check if uuid-ossp extension exists
      const extensionCheck = await this.dbConnection.query(`
        SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
      `);

      const hasUuidExtension =
        extensionCheck.rows && extensionCheck.rows.length > 0;
      const idDefault = hasUuidExtension
        ? "DEFAULT uuid_generate_v4()"
        : "DEFAULT gen_random_uuid()";

      await this.dbConnection.query(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id UUID PRIMARY KEY ${idDefault},
          user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          action VARCHAR(255) NOT NULL,
          resource_type VARCHAR(100) NOT NULL,
          resource_id VARCHAR(255),
          details JSONB NOT NULL DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes for performance
      await this.dbConnection.query(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)
      `);
      await this.dbConnection.query(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id)
      `);
      await this.dbConnection.query(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)
      `);
      await this.dbConnection.query(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)
      `);
      await this.dbConnection.query(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs(severity)
      `);

      this.initialized = true;
      this.logger.info("Activity logging table initialized");
    } catch (error) {
      this.logger.error("Failed to initialize activity logging table:", error);
      // Don't throw error, just log it - this service is not critical for basic functionality
    }
  }

  /**
   * Ensure table is initialized before any operation
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeActivityTable();
    }
  }

  /**
   * Log an activity
   */
  async log(
    activity: Omit<ActivityLog, "id" | "timestamp" | "created_at">
  ): Promise<ActivityLog> {
    await this.ensureInitialized();

    try {
      // Handle string user IDs by making them optional for test activities
      const userId =
        activity.user_id &&
        typeof activity.user_id === "string" &&
        activity.user_id.includes("-")
          ? activity.user_id
          : null;

      const result = await this.dbConnection.query(
        `
        INSERT INTO activity_logs (
          user_id, project_id, action, resource_type, resource_id, 
          details, ip_address, user_agent, severity, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
        [
          userId,
          activity.project_id,
          activity.action,
          activity.resource_type,
          activity.resource_id,
          JSON.stringify(activity.details),
          activity.ip_address,
          activity.user_agent,
          activity.severity,
          JSON.stringify(activity.metadata || {}),
        ]
      );

      const loggedActivity = result.rows?.[0] as ActivityLog;
      this.logger.info(
        `Activity logged: ${activity.action} on ${activity.resource_type}`
      );

      return loggedActivity;
    } catch (error) {
      this.logger.error("Failed to log activity:", error);
      throw error;
    }
  }

  /**
   * Query activity logs
   */
  async query(
    query: ActivityQuery
  ): Promise<{ logs: ActivityLog[]; total: number }> {
    await this.ensureInitialized();

    try {
      let whereClause = "WHERE 1=1";
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query.user_id) {
        whereClause += ` AND user_id = $${paramIndex++}`;
        params.push(query.user_id);
      }

      if (query.project_id) {
        whereClause += ` AND project_id = $${paramIndex++}`;
        params.push(query.project_id);
      }

      if (query.action) {
        whereClause += ` AND action = $${paramIndex++}`;
        params.push(query.action);
      }

      if (query.resource_type) {
        whereClause += ` AND resource_type = $${paramIndex++}`;
        params.push(query.resource_type);
      }

      if (query.resource_id) {
        whereClause += ` AND resource_id = $${paramIndex++}`;
        params.push(query.resource_id);
      }

      if (query.severity) {
        whereClause += ` AND severity = $${paramIndex++}`;
        params.push(query.severity);
      }

      if (query.start_date) {
        whereClause += ` AND timestamp >= $${paramIndex++}`;
        params.push(query.start_date);
      }

      if (query.end_date) {
        whereClause += ` AND timestamp <= $${paramIndex++}`;
        params.push(query.end_date);
      }

      // Get total count
      const countResult = await this.dbConnection.query(
        `
        SELECT COUNT(*) FROM activity_logs ${whereClause}
      `,
        params
      );
      const total = parseInt(
        (countResult.rows?.[0] as { count: string }).count || "0"
      );

      // Get logs with pagination
      const limit = query.limit || 100;
      const offset = query.offset || 0;

      const logsResult = await this.dbConnection.query(
        `
        SELECT * FROM activity_logs ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `,
        [...params, limit, offset]
      );

      const logs = (logsResult.rows || [] as unknown[]).map(
        (row: unknown) => {
          const rowData = row as Record<string, unknown>;
          return {
          ...rowData,
          timestamp: new Date(rowData.timestamp as string),
          details:
            typeof rowData.details === "string"
              ? JSON.parse(rowData.details)
              : rowData.details,
          metadata:
            typeof rowData.metadata === "string"
              ? JSON.parse(rowData.metadata)
              : rowData.metadata,
        };
        }
      ) as ActivityLog[];

      return { logs, total };
    } catch (error) {
      this.logger.error("Failed to query activity logs:", error);
      throw error;
    }
  }

  /**
   * Get recent activity for a user or project
   */
  async getRecentActivity(
    userId?: string,
    projectId?: string,
    limit = 50
  ): Promise<ActivityLog[]> {
    await this.ensureInitialized();

    const query: ActivityQuery = { limit };
    if (userId) query.user_id = userId;
    if (projectId) query.project_id = projectId;

    const result = await this.query(query);
    return result.logs;
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(
    projectId?: string,
    days = 30
  ): Promise<{
    total_actions: number;
    actions_by_type: Record<string, number>;
    actions_by_severity: Record<string, number>;
    actions_by_user: Record<string, number>;
  }> {
    await this.ensureInitialized();

    try {
      // For SQLite, calculate the date in JavaScript and pass as parameter
      // datetime('now', '-' || $1 || ' days') doesn't work with parameter binding
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      let whereClause = "WHERE timestamp >= $1";
      const params: unknown[] = [cutoffDate];

      if (projectId) {
        whereClause += " AND project_id = $2";
        params.push(projectId);
      }

      // Optimize queries for SQLite - return empty stats if table doesn't exist or has no data
      // This prevents timeouts on empty databases
      try {
        // Check if table exists and has data
        const checkResult = await this.dbConnection.query(
          `SELECT COUNT(*) as count FROM activity_logs LIMIT 1`
        );
        const hasData = parseInt(
          (checkResult.rows?.[0] as { count: string })?.count || "0"
        ) > 0;

        if (!hasData) {
          return {
            total_actions: 0,
            actions_by_type: {},
            actions_by_severity: {},
            actions_by_user: {},
          };
        }
      } catch {
        // Table doesn't exist, return empty stats
        return {
          total_actions: 0,
          actions_by_type: {},
          actions_by_severity: {},
          actions_by_user: {},
        };
      }

      // Total actions
      const totalResult = await this.dbConnection.query(
        `
        SELECT COUNT(*) as count FROM activity_logs ${whereClause}
      `,
        params
      );
      const total_actions = parseInt(
        (totalResult.rows?.[0] as { count: string }).count || "0"
      );

      // Actions by type - optimized query
      const typeResult = await this.dbConnection.query(
        `
        SELECT action, COUNT(*) as count 
        FROM activity_logs ${whereClause}
        GROUP BY action
        ORDER BY count DESC
        LIMIT 50
      `,
        params
      );
      const actions_by_type: Record<string, number> = {};
      (typeResult.rows || [] as unknown[]).forEach((row: unknown) => {
        const rowData = row as Record<string, unknown>;
        actions_by_type[rowData.action as string] = parseInt(
          (rowData.count as string) || "0"
        );
      });

      // Actions by severity - optimized query
      const severityResult = await this.dbConnection.query(
        `
        SELECT severity, COUNT(*) as count 
        FROM activity_logs ${whereClause}
        GROUP BY severity
        ORDER BY count DESC
        LIMIT 20
      `,
        params
      );
      const actions_by_severity: Record<string, number> = {};
      (severityResult.rows || [] as unknown[]).forEach((row: unknown) => {
        const rowData = row as Record<string, unknown>;
        actions_by_severity[rowData.severity as string] = parseInt(
          (rowData.count as string) || "0"
        );
      });

      // Actions by user - optimized query with LIMIT
      const userResult = await this.dbConnection.query(
        `
        SELECT user_id, COUNT(*) as count 
        FROM activity_logs ${whereClause} AND user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 10
      `,
        params
      );
      const actions_by_user: Record<string, number> = {};
      (userResult.rows || [] as unknown[]).forEach((row: unknown) => {
        const rowData = row as Record<string, unknown>;
        actions_by_user[rowData.user_id as string] = parseInt(
          (rowData.count as string) || "0"
        );
      });

      return {
        total_actions,
        actions_by_type,
        actions_by_severity,
        actions_by_user,
      };
    } catch (error) {
      this.logger.error("Failed to get activity statistics:", error);
      throw error;
    }
  }

  /**
   * Clean old activity logs
   */
  async cleanOldLogs(daysToKeep = 90): Promise<number> {
    await this.ensureInitialized();

    try {
      const result = await this.dbConnection.query(
        `
        DELETE FROM activity_logs 
        WHERE timestamp < NOW() - INTERVAL '1 day' * $1
      `,
        [daysToKeep]
      );

      const deletedCount = (result as { rowCount?: number }).rowCount || 0;
      this.logger.info(`Cleaned ${deletedCount} old activity logs`);

      return deletedCount;
    } catch (error) {
      this.logger.error("Failed to clean old activity logs:", error);
      throw error;
    }
  }
}
