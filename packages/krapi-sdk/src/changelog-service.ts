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
 * 
 * @class ChangelogService
 * @example
 * const changelogService = new ChangelogService(dbConnection, logger);
 * const entry = await changelogService.create({
 *   entity_type: 'project',
 *   entity_id: 'project-id',
 *   action: 'created',
 *   changes: { name: 'New Project' }
 * });
 */
export class ChangelogService {
  /**
   * Create a new ChangelogService instance
   * 
   * @param {DatabaseConnection} dbConnection - Database connection
   * @param {Logger} logger - Logger instance
   */
  constructor(
    private dbConnection: DatabaseConnection,
    private logger: Logger
  ) {}

  /**
   * Create a new changelog entry
   * 
   * @param {CreateChangelogEntryParams} params - Changelog entry parameters
   * @param {string} params.entity_type - Entity type (e.g., 'project', 'collection')
   * @param {string} params.entity_id - Entity ID
   * @param {string} params.action - Action performed (e.g., 'created', 'updated', 'deleted')
   * @param {Record<string, unknown>} params.changes - Changes made
   * @param {string} [params.user_id] - User ID who performed the action
   * @param {Record<string, unknown>} [params.metadata] - Additional metadata
   * @returns {Promise<ChangelogEntry>} Created changelog entry
   * @throws {Error} If creation fails
   * 
   * @example
   * const entry = await changelogService.create({
   *   entity_type: 'project',
   *   entity_id: 'project-id',
   *   action: 'updated',
   *   changes: { name: 'New Name' },
   *   user_id: 'user-id'
   * });
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
      const changelogEntry: ChangelogEntry = {
        id: entry.id as string,
        entity_type: entry.entity_type as string,
        entity_id: entry.entity_id as string,
        action: entry.action as string,
        changes: entry.changes as Record<string, unknown>,
        timestamp: new Date(entry.timestamp as string),
      };
      if (entry.user_id !== undefined && entry.user_id !== null) {
        changelogEntry.user_id = entry.user_id as string;
      }
      if (entry.metadata !== undefined && entry.metadata !== null) {
        changelogEntry.metadata = entry.metadata as Record<string, unknown>;
      }
      return changelogEntry;
    } catch (error) {
      this.logger.error("Failed to create changelog entry", { error, params });
      throw error;
    }
  }

  /**
   * Get changelog entries by entity
   * 
   * @param {string} entity_type - Entity type
   * @param {string} entity_id - Entity ID
   * @param {ChangelogQueryOptions} [options] - Query options
   * @returns {Promise<ChangelogEntry[]>} Array of changelog entries
   * @throws {Error} If query fails
   * 
   * @example
   * const entries = await changelogService.getByEntity('project', 'project-id', {
   *   limit: 10,
   *   action: 'created'
   * });
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

      return (result.rows || [] as unknown[]).map((row: unknown): ChangelogEntry => {
        const rowData = row as Record<string, unknown>;
        const entry: ChangelogEntry = {
          id: rowData.id as string,
          entity_type: rowData.entity_type as string,
          entity_id: rowData.entity_id as string,
          action: rowData.action as string,
          changes: rowData.changes as Record<string, unknown>,
          timestamp: new Date(rowData.timestamp as string),
        };
        if (rowData.user_id !== undefined && rowData.user_id !== null) {
          entry.user_id = rowData.user_id as string;
        }
        if (rowData.metadata !== undefined && rowData.metadata !== null) {
          entry.metadata = rowData.metadata as Record<string, unknown>;
        }
        return entry;
      });
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

      return (result.rows || [] as unknown[]).map((row: unknown): ChangelogEntry => {
        const rowData = row as Record<string, unknown>;
        const entry: ChangelogEntry = {
          id: rowData.id as string,
          entity_type: rowData.entity_type as string,
          entity_id: rowData.entity_id as string,
          action: rowData.action as string,
          changes: rowData.changes as Record<string, unknown>,
          timestamp: new Date(rowData.timestamp as string),
        };
        if (rowData.user_id !== undefined && rowData.user_id !== null) {
          entry.user_id = rowData.user_id as string;
        }
        if (rowData.metadata !== undefined && rowData.metadata !== null) {
          entry.metadata = rowData.metadata as Record<string, unknown>;
        }
        return entry;
      });
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
