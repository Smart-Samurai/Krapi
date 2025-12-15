import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";
import { DatabaseMappersService } from "../database-mappers.service";

import { BackendChangelogEntry } from "@/types";

/**
 * Activity Log Service
 * 
 * Handles activity log queries and filtering.
 * Activity logs are stored in changelog (project-specific databases).
 */
export class ActivityLogService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService,
    private mappers: DatabaseMappersService
  ) {}

  /**
   * Get activity logs
   */
  async getActivityLogs(options: {
    limit: number;
    offset: number;
    project_id?: string;
    filters?: {
      entity_type?: string;
      entity_id?: string;
      user_id?: string;
      action?: string;
      start_date?: string;
      end_date?: string;
    };
  }): Promise<{ logs: BackendChangelogEntry[]; total: number }> {
    await this.core.ensureReady();
    
    const { limit, offset, project_id, filters } = options;

    if (!project_id) {
      throw new Error("project_id is required for getActivityLogs");
    }

    let whereClause = "WHERE project_id = $1";
    const params: unknown[] = [project_id];
    let paramCount = 1;

    if (filters) {
      if (filters.entity_type) {
        whereClause += ` AND entity_type = $${++paramCount}`;
        params.push(filters.entity_type);
      }
      if (filters.entity_id) {
        whereClause += ` AND entity_id = $${++paramCount}`;
        params.push(filters.entity_id);
      }
      if (filters.user_id) {
        whereClause += ` AND user_id = $${++paramCount}`;
        params.push(filters.user_id);
      }
      if (filters.action) {
        whereClause += ` AND action = $${++paramCount}`;
        params.push(filters.action);
      }
      if (filters.start_date) {
        whereClause += ` AND created_at >= $${++paramCount}`;
        params.push(filters.start_date);
      }
      if (filters.end_date) {
        whereClause += ` AND created_at <= $${++paramCount}`;
        params.push(filters.end_date);
      }
    }

    // Get total count (from project DB)
    const countResult = await this.dbManager.queryProject(
      project_id,
      `SELECT COUNT(*) as count FROM changelog ${whereClause}`,
      params
    );
    const total = parseInt(String(countResult.rows[0]?.count || 0));

    // Get logs (from project DB)
    const logsResult = await this.dbManager.queryProject(
      project_id,
      `SELECT * FROM changelog ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    const logs = logsResult.rows.map((row) =>
      this.mappers.mapChangelogEntry(row as Record<string, unknown>)
    );

    return { logs, total };
  }
}








