import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";
import { DatabaseMappersService } from "../database-mappers.service";

import {
  BackendChangelogEntry,
  CreateBackendChangelogEntry,
} from "@/types";

/**
 * Changelog Service
 * 
 * Handles all changelog operations and statistics.
 * Changelog entries are stored in project-specific databases.
 */
export class ChangelogService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService,
    private mappers: DatabaseMappersService
  ) {}

  /**
   * Create changelog entry
   */
  async createChangelogEntry(
    data: CreateBackendChangelogEntry
  ): Promise<BackendChangelogEntry> {
    await this.core.ensureReady();
    
    // Generate changelog entry ID (SQLite doesn't support RETURNING *)
    const entryId = uuidv4();
    const createdAt = new Date().toISOString();

    // If no project_id, store in main database (for admin/system actions)
    if (!data.project_id) {
      // Store admin actions in a system activity log (using sessions table or create a separate table)
      // For now, skip storing admin-only actions in changelog since it's project-specific
      // Return a minimal entry for compatibility
      const entry: BackendChangelogEntry = {
        id: entryId,
        action: data.action,
        changes: data.changes || {},
        created_at: createdAt,
        user_id: data.user_id,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
      };
      if (data.entity_type !== undefined) {
        entry.entity_type = data.entity_type;
      }
      if (data.entity_id !== undefined) {
        entry.entity_id = data.entity_id;
      }
      if (data.performed_by !== undefined && data.performed_by !== null) {
        entry.performed_by = data.performed_by;
      }
      if (data.session_id !== undefined && data.session_id !== null) {
        entry.session_id = data.session_id;
      }
      // project_id is omitted for admin-only actions
      return entry;
    }

    // Insert into project DB for project-specific actions
    await this.dbManager.queryProject(
      data.project_id,
      `INSERT INTO changelog (id, project_id, collection_id, action, entity_type, entity_id, changes, user_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entryId,
        data.project_id,
        (data as { collection_id?: string }).collection_id || null,
        data.action,
        data.entity_type ?? null,
        data.entity_id ?? null,
        JSON.stringify(data.changes || {}), // SQLite stores objects as JSON strings
        data.performed_by ?? null,
        createdAt,
      ]
    );

    // Query back the inserted row (SQLite doesn't support RETURNING *)
    const result = await this.dbManager.queryProject(
      data.project_id,
      "SELECT * FROM changelog WHERE id = $1",
      [entryId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to create changelog entry");
    }
    return this.mappers.mapChangelogEntry(row as Record<string, unknown>);
  }

  /**
   * Get project changelog
   */
  async getProjectChangelog(
    projectId: string,
    limit = 100
  ): Promise<BackendChangelogEntry[]> {
    await this.core.ensureReady();
    
    // Changelog is in project DB, but we can't join with admin_users (which is in main DB)
    // So just get the changelog entries
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * 
       FROM changelog 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map((row) => this.mappers.mapChangelogEntry(row));
  }

  /**
   * Get changelog entries with filters
   */
  async getChangelogEntries(filters: {
    project_id?: string;
    entity_type?: string;
    entity_id?: string;
    limit?: number;
    offset?: number;
    collection_name?: string;
    user_id?: string;
    action_type?: string;
    start_date?: string;
    end_date?: string;
    document_id?: string;
  }): Promise<BackendChangelogEntry[]> {
    await this.core.ensureReady();
    
    const {
      project_id,
      entity_type,
      entity_id,
      limit = 100,
      offset = 0,
      collection_name,
      user_id,
      action_type,
      start_date,
      end_date,
      document_id,
    } = filters;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (project_id) {
      conditions.push(`project_id = $${values.length + 1}`);
      values.push(project_id);
    }

    if (entity_type) {
      conditions.push(`entity_type = $${values.length + 1}`);
      values.push(entity_type);
    }

    if (entity_id) {
      conditions.push(`entity_id = $${values.length + 1}`);
      values.push(entity_id);
    }

    if (collection_name) {
      conditions.push(
        `entity_type = 'collection' AND entity_id = $${values.length + 1}`
      );
      values.push(collection_name);
    }

    if (user_id) {
      conditions.push(`performed_by = $${values.length + 1}`);
      values.push(user_id);
    }

    if (action_type) {
      conditions.push(`action = $${values.length + 1}`);
      values.push(action_type);
    }

    if (start_date) {
      conditions.push(`created_at >= $${values.length + 1}`);
      values.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $${values.length + 1}`);
      values.push(end_date);
    }

    if (document_id) {
      conditions.push(
        `entity_type = 'document' AND entity_id = $${values.length + 1}`
      );
      values.push(document_id);
    }

    values.push(limit);

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Changelog is in project DB, so we need project_id
    if (!project_id) {
      throw new Error("project_id is required for getChangelogEntries");
    }

    // Get changelog entries from project DB (can't join with admin_users in main DB)
    const result = await this.dbManager.queryProject(
      project_id,
      `SELECT * 
       FROM changelog 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${values.length} OFFSET $${values.length + 1}`,
      [...values, offset]
    );

    return result.rows.map((row) => this.mappers.mapChangelogEntry(row));
  }

  /**
   * Get changelog statistics for a project
   */
  async getChangelogStatistics(
    projectId: string,
    options: {
      period: string;
      start_date?: string;
      end_date?: string;
      group_by: string;
    }
  ): Promise<{
    total_entries: number;
    by_action_type: Record<string, number>;
    by_user: Record<string, number>;
    by_entity_type: Record<string, number>;
    timeline: Array<{ date: string; count: number }>;
  }> {
    await this.core.ensureReady();
    
    try {
      let whereClause = "WHERE project_id = $1";
      const params = [projectId];
      let paramCount = 1;

      if (options.start_date) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        params.push(options.start_date);
      }

      if (options.end_date) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        params.push(options.end_date);
      }

      // Changelog is in project DBs
      // Get total entries (from project DB)
      const totalResult = await this.dbManager.queryProject(
        projectId,
        `SELECT COUNT(*) as count FROM changelog ${whereClause}`,
        params
      );
      const totalEntries = parseInt(String(totalResult.rows[0]?.count || 0));

      // Get by action type (from project DB)
      const actionTypeResult = await this.dbManager.queryProject(
        projectId,
        `SELECT action, COUNT(*) as count FROM changelog ${whereClause} GROUP BY action`,
        params
      );
      const byActionType: Record<string, number> = {};
      actionTypeResult.rows.forEach((row) => {
        const typedRow = row as { action: string; count: unknown };
        byActionType[typedRow.action] = parseInt(String(typedRow.count || 0));
      });

      // Get by user (from project DB)
      const userResult = await this.dbManager.queryProject(
        projectId,
        `SELECT user_id, COUNT(*) as count FROM changelog ${whereClause} GROUP BY user_id`,
        params
      );
      const byUser: Record<string, number> = {};
      userResult.rows.forEach((row) => {
        const typedRow = row as { user_id: string; count: unknown };
        byUser[typedRow.user_id] = parseInt(String(typedRow.count || 0));
      });

      // Get by entity type (from project DB)
      const entityTypeResult = await this.dbManager.queryProject(
        projectId,
        `SELECT entity_type, COUNT(*) as count FROM changelog ${whereClause} GROUP BY entity_type`,
        params
      );
      const byEntityType: Record<string, number> = {};
      entityTypeResult.rows.forEach((row) => {
        const typedRow = row as { entity_type: string; count: unknown };
        byEntityType[typedRow.entity_type] = parseInt(
          String(typedRow.count || 0)
        );
      });

      // Get timeline data (SQLite doesn't support DATE_TRUNC, use strftime instead) - from project DB
      let timelineQuery = `SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count FROM changelog ${whereClause}`;
      if (options.period === "day") {
        timelineQuery += " GROUP BY date(created_at) ORDER BY date";
      } else if (options.period === "week") {
        timelineQuery +=
          " GROUP BY strftime('%Y-%W', created_at) ORDER BY date";
      } else if (options.period === "month") {
        timelineQuery +=
          " GROUP BY strftime('%Y-%m', created_at) ORDER BY date";
      }

      const timelineResult = await this.dbManager.queryProject(
        projectId,
        timelineQuery,
        params
      );
      const timeline = timelineResult.rows.map((row) => {
        const typedRow = row as { date: unknown; count: unknown };
        return {
          date: String(typedRow.date || ""),
          count: parseInt(String(typedRow.count || 0)),
        };
      });

      return {
        total_entries: totalEntries,
        by_action_type: byActionType,
        by_user: byUser,
        by_entity_type: byEntityType,
        timeline,
      };
    } catch (error) {
      console.error("Error getting changelog statistics:", error);
      throw error;
    }
  }

  /**
   * Export changelog data
   */
  async exportChangelog(
    projectId: string,
    options: {
      format: string;
      start_date?: string;
      end_date?: string;
      action_type?: string;
      user_id?: string;
      entity_type?: string;
    }
  ): Promise<{
    format: string;
    data: Record<string, unknown>[];
    filename: string;
    download_url: string;
  }> {
    await this.core.ensureReady();
    
    try {
      let whereClause = "WHERE project_id = $1";
      const params = [projectId];
      let paramCount = 1;

      if (options.start_date) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        params.push(options.start_date);
      }

      if (options.end_date) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        params.push(options.end_date);
      }

      if (options.action_type) {
        paramCount++;
        whereClause += ` AND action = $${paramCount}`;
        params.push(options.action_type);
      }

      if (options.user_id) {
        paramCount++;
        whereClause += ` AND user_id = $${paramCount}`;
        params.push(options.user_id);
      }

      if (options.entity_type) {
        paramCount++;
        whereClause += ` AND entity_type = $${paramCount}`;
        params.push(options.entity_type);
      }

      // Changelog is in project DBs
      const result = await this.dbManager.queryProject(
        projectId,
        `SELECT * FROM changelog ${whereClause} ORDER BY created_at DESC`,
        params
      );

      const data = result.rows;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `changelog_${projectId}_${timestamp}.${options.format}`;

      // In a real implementation, you'd save this to a file and return a download URL
      const downloadUrl = `/api/changelog/export/${projectId}/download/${filename}`;

      return {
        format: options.format,
        data,
        filename,
        download_url: downloadUrl,
      };
    } catch (error) {
      console.error("Error exporting changelog:", error);
      throw error;
    }
  }

  /**
   * Purge old changelog entries
   */
  async purgeOldChangelog(options: {
    project_id: string;
    days_old: number;
    keep_recent?: number;
  }): Promise<{ deleted: number }> {
    await this.core.ensureReady();
    
    try {
      // Changelog is in project DBs
      const result = await this.dbManager.queryProject(
        options.project_id,
        `DELETE FROM changelog 
         WHERE project_id = $1 
         AND created_at < datetime('now', '-${options.days_old} days')
         AND id NOT IN (
           SELECT id FROM changelog 
           WHERE project_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2
         )`,
        [options.project_id, options.keep_recent || 1000]
      );

      return { deleted: result.rowCount ?? 0 };
    } catch (error) {
      console.error("Error purging old changelog:", error);
      throw error;
    }
  }
}








