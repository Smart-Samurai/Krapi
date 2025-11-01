import { DatabaseConnection, Logger } from "./core";

export interface ChangelogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown>;
  user_id?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateChangelogEntryParams {
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown>;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ChangelogQueryOptions {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  action?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Service for managing changelog entries to track changes to entities
 */
export class ChangelogService {
  constructor(
    private dbConnection: DatabaseConnection,
    private logger: Logger
  ) {}

  /**
   * Create a new changelog entry
   */
  async create(params: CreateChangelogEntryParams): Promise<ChangelogEntry> {
    try {
      const { entity_type, entity_id, action, changes, user_id, metadata } =
        params;

      const query = `
        INSERT INTO changelog (entity_type, entity_id, action, changes, user_id, metadata, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;

      const values = [
        entity_type,
        entity_id,
        action,
        JSON.stringify(changes),
        user_id || null,
        metadata ? JSON.stringify(metadata) : null,
      ];

      const result = await this.dbConnection.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("Failed to create changelog entry");
      }

      const entry = result.rows[0] as Record<string, unknown>;
      return {
        id: entry.id as string,
        entity_type: entry.entity_type as string,
        entity_id: entry.entity_id as string,
        action: entry.action as string,
        changes: entry.changes as Record<string, unknown>,
        user_id: entry.user_id as string | undefined,
        timestamp: new Date(entry.timestamp as string),
        metadata: entry.metadata as Record<string, unknown> | undefined,
      };
    } catch (error) {
      this.logger.error("Failed to create changelog entry", { error, params });
      throw error;
    }
  }

  /**
   * Get changelog entries by entity
   */
  async getByEntity(
    entity_type: string,
    entity_id: string,
    options: ChangelogQueryOptions = {}
  ): Promise<ChangelogEntry[]> {
    try {
      let query = `
        SELECT * FROM changelog 
        WHERE entity_type = $1 AND entity_id = $2
      `;

      const values: unknown[] = [entity_type, entity_id];
      let paramIndex = 3;

      if (options.user_id) {
        query += ` AND user_id = $${paramIndex}`;
        values.push(options.user_id);
        paramIndex++;
      }

      if (options.action) {
        query += ` AND action = $${paramIndex}`;
        values.push(options.action);
        paramIndex++;
      }

      if (options.start_date) {
        query += ` AND timestamp >= $${paramIndex}`;
        values.push(options.start_date);
        paramIndex++;
      }

      if (options.end_date) {
        query += ` AND timestamp <= $${paramIndex}`;
        values.push(options.end_date);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC`;

      if (options.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(options.limit);
        paramIndex++;
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(options.offset);
        paramIndex++;
      }

      const result = await this.dbConnection.query(query, values);

      return result.rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        entity_type: row.entity_type as string,
        entity_id: row.entity_id as string,
        action: row.action as string,
        changes: row.changes as Record<string, unknown>,
        user_id: row.user_id as string | undefined,
        timestamp: new Date(row.timestamp as string),
        metadata: row.metadata as Record<string, unknown> | undefined,
      }));
    } catch (error) {
      this.logger.error("Failed to get changelog entries by entity", {
        error,
        entity_type,
        entity_id,
        options,
      });
      throw error;
    }
  }

  /**
   * Get all changelog entries with filtering
   */
  async getAll(options: ChangelogQueryOptions = {}): Promise<ChangelogEntry[]> {
    try {
      let query = `SELECT * FROM changelog WHERE 1=1`;
      const values: unknown[] = [];
      let paramIndex = 1;

      if (options.entity_type) {
        query += ` AND entity_type = $${paramIndex}`;
        values.push(options.entity_type);
        paramIndex++;
      }

      if (options.entity_id) {
        query += ` AND entity_id = $${paramIndex}`;
        values.push(options.entity_id);
        paramIndex++;
      }

      if (options.user_id) {
        query += ` AND user_id = $${paramIndex}`;
        values.push(options.user_id);
        paramIndex++;
      }

      if (options.action) {
        query += ` AND action = $${paramIndex}`;
        values.push(options.action);
        paramIndex++;
      }

      if (options.start_date) {
        query += ` AND timestamp >= $${paramIndex}`;
        values.push(options.start_date);
        paramIndex++;
      }

      if (options.end_date) {
        query += ` AND timestamp <= $${paramIndex}`;
        values.push(options.end_date);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC`;

      if (options.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(options.limit);
        paramIndex++;
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(options.offset);
        paramIndex++;
      }

      const result = await this.dbConnection.query(query, values);

      return result.rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        entity_type: row.entity_type as string,
        entity_id: row.entity_id as string,
        action: row.action as string,
        changes: row.changes as Record<string, unknown>,
        user_id: row.user_id as string | undefined,
        timestamp: new Date(row.timestamp as string),
        metadata: row.metadata as Record<string, unknown> | undefined,
      }));
    } catch (error) {
      this.logger.error("Failed to get all changelog entries", {
        error,
        options,
      });
      throw error;
    }
  }

  /**
   * Delete changelog entries by entity
   */
  async deleteByEntity(
    entity_type: string,
    entity_id: string
  ): Promise<number> {
    try {
      const query = `
        DELETE FROM changelog 
        WHERE entity_type = $1 AND entity_id = $2
      `;

      const result = await this.dbConnection.query(query, [
        entity_type,
        entity_id,
      ]);
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error("Failed to delete changelog entries by entity", {
        error,
        entity_type,
        entity_id,
      });
      throw error;
    }
  }

  /**
   * Clear old changelog entries
   */
  async clearOldEntries(daysOld: number): Promise<number> {
    try {
      const query = `
        DELETE FROM changelog 
        WHERE timestamp < NOW() - INTERVAL '${daysOld} days'
      `;

      const result = await this.dbConnection.query(query);
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error("Failed to clear old changelog entries", {
        error,
        daysOld,
      });
      throw error;
    }
  }
}
