import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";
import { DatabaseMappersService } from "../database-mappers.service";

import { Collection, CollectionField, CollectionIndex } from "@/types";

/**
 * Collection Service
 *
 * Handles all collection CRUD operations.
 * Collections are stored in project-specific databases.
 */
export class CollectionService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService,
    private mappers: DatabaseMappersService
  ) {}

  /**
   * Create a new collection
   */
  async createCollection(
    projectId: string,
    collectionName: string,
    schema: {
      description?: string;
      fields: CollectionField[];
      indexes?: CollectionIndex[];
    },
    createdBy: string
  ): Promise<Collection> {
    try {
      await this.core.ensureReady();

      // Collections are stored in project-specific databases
      const collectionId = uuidv4();
      await this.dbManager.queryProject(
        projectId,
        `INSERT INTO collections (id, project_id, name, description, fields, indexes, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          collectionId,
          projectId,
          collectionName,
          schema.description || null,
          JSON.stringify(schema.fields),
          JSON.stringify(schema.indexes || []),
          createdBy,
        ]
      );

      // Query back the inserted row
      // CRITICAL: Retry query to ensure SQLite WAL mode has committed the write
      let result = await this.dbManager.queryProject(
        projectId,
        `SELECT * FROM collections WHERE id = $1`,
        [collectionId]
      );

      // If not found immediately, retry a few times (SQLite WAL mode delay)
      let retries = 0;
      const maxRetries = 5;
      while (result.rows.length === 0 && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        result = await this.dbManager.queryProject(
          projectId,
          `SELECT * FROM collections WHERE id = $1`,
          [collectionId]
        );
        retries++;
      }

      const row = result.rows[0];
      if (!row) {
        throw new Error("Collection not found after creation");
      }
      return this.mappers.mapCollection(row as Record<string, unknown>);
    } catch (error) {
      // Check for duplicate collection name error
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        const duplicateError = new Error(
          "Collection with this name already exists in this project"
        );
        (duplicateError as Error & { code: string; statusCode: number }).code =
          "DUPLICATE_COLLECTION_NAME";
        (
          duplicateError as Error & { code: string; statusCode: number }
        ).statusCode = 409;
        throw duplicateError;
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get collection by name or ID
   * Supports both collection names and UUID collection IDs
   */
  async getCollection(
    projectId: string,
    collectionNameOrId: string
  ): Promise<Collection | null> {
    await this.core.ensureReady();

    // Check if the input is a UUID (collection ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(collectionNameOrId);

    if (isUUID) {
      // Look up by ID
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM collections WHERE id = $1 AND project_id = $2",
        [collectionNameOrId, projectId]
      );
      const row = result.rows[0];
      return row
        ? this.mappers.mapCollection(row as Record<string, unknown>)
        : null;
    }

    // Normalize collection name: URL decode, trim whitespace
    let normalizedCollectionName = collectionNameOrId;
    try {
      normalizedCollectionName = decodeURIComponent(collectionNameOrId);
    } catch {
      normalizedCollectionName = collectionNameOrId;
    }
    normalizedCollectionName = normalizedCollectionName.trim();

    // Try exact match first
    let result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, normalizedCollectionName]
    );

    // If exact match fails, try case-insensitive match
    if (result.rows.length === 0) {
      const allCollectionsResult = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM collections WHERE project_id = $1",
        [projectId]
      );
      
      const caseInsensitiveMatch = allCollectionsResult.rows.find(
        (row) => {
          const rowName = row.name as string | undefined;
          return rowName?.toLowerCase() === normalizedCollectionName.toLowerCase();
        }
      );
      
      if (caseInsensitiveMatch) {
        // Re-query with the actual collection name from database
        result = await this.dbManager.queryProject(
          projectId,
          "SELECT * FROM collections WHERE project_id = $1 AND name = $2",
          [projectId, caseInsensitiveMatch.name]
        );
      }
    }

    const row = result.rows[0];
    return row
      ? this.mappers.mapCollection(row as Record<string, unknown>)
      : null;
  }

  /**
   * Get collection by ID
   */
  async getCollectionById(_collectionId: string): Promise<Collection | null> {
    // Note: This method signature is kept for backward compatibility
    // but collection lookup by ID alone is not supported without projectId
    throw new Error(
      "getCollectionById requires projectId. Use getCollection(projectId, collectionName) instead."
    );
  }

  /**
   * Get all collections for a project
   */
  async getProjectCollections(projectId: string): Promise<Collection[]> {
    await this.core.ensureReady();

    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM collections WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );

    return result.rows.map((row) =>
      this.mappers.mapCollection(row as Record<string, unknown>)
    );
  }

  /**
   * Update collection
   */
  async updateCollection(
    projectId: string,
    collectionName: string,
    updates: {
      description?: string;
      fields?: CollectionField[];
      indexes?: CollectionIndex[];
    }
  ): Promise<Collection | null> {
    await this.core.ensureReady();

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.fields !== undefined) {
      setClauses.push(`fields = $${paramCount++}`);
      values.push(JSON.stringify(updates.fields));
    }
    if (updates.indexes !== undefined) {
      setClauses.push(`indexes = $${paramCount++}`);
      values.push(JSON.stringify(updates.indexes));
    }

    if (setClauses.length === 0) {
      return this.getCollection(projectId, collectionName);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(projectId, collectionName);

    // SQLite doesn't support RETURNING *, so update and query back separately
    await this.dbManager.queryProject(
      projectId,
      `UPDATE collections SET ${setClauses.join(
        ", "
      )} WHERE project_id = $${paramCount} AND name = $${paramCount + 1}`,
      values
    );

    // Query back the updated row
    return this.getCollection(projectId, collectionName);
  }

  /**
   * Delete collection
   */
  async deleteCollection(
    projectId: string,
    collectionName: string
  ): Promise<boolean> {
    await this.core.ensureReady();

    // First, get the collection to check if it exists
    const collection = await this.getCollection(projectId, collectionName);
    if (!collection) {
      return false;
    }

    // Delete all documents in the collection first
    await this.dbManager.queryProject(
      projectId,
      "DELETE FROM documents WHERE collection_id = $1",
      [collection.id]
    );

    // Delete the collection
    const result = await this.dbManager.queryProject(
      projectId,
      "DELETE FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get table schema (alias for getCollection)
   */
  async getTableSchema(
    projectId: string,
    tableName: string
  ): Promise<Collection | null> {
    return this.getCollection(projectId, tableName);
  }

  /**
   * Get all table schemas for a project (alias for getProjectCollections)
   */
  async getProjectTableSchemas(projectId: string): Promise<Collection[]> {
    return this.getProjectCollections(projectId);
  }

  /**
   * Update table schema (alias for updateCollection)
   */
  async updateTableSchema(
    projectId: string,
    tableName: string,
    updates: {
      description?: string;
      fields?: CollectionField[];
      indexes?: CollectionIndex[];
    }
  ): Promise<Collection | null> {
    return this.updateCollection(projectId, tableName, updates);
  }

  /**
   * Delete table schema (alias for deleteCollection)
   */
  async deleteTableSchema(
    projectId: string,
    tableName: string
  ): Promise<boolean> {
    return this.deleteCollection(projectId, tableName);
  }

  /**
   * Create table schema (alias for createCollection)
   */
  async createTableSchema(
    projectId: string,
    tableName: string,
    schema: {
      description?: string;
      fields: CollectionField[];
      indexes?: CollectionIndex[];
    },
    createdBy: string
  ): Promise<Collection> {
    return this.createCollection(projectId, tableName, schema, createdBy);
  }
}
