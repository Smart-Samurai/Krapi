import KrapiLogger from "@krapi/logger";
import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";
import { DatabaseMappersService } from "../database-mappers.service";

import { Document } from "@/types";

const logger = KrapiLogger.getInstance();

/**
 * Document Service
 * 
 * Handles all document CRUD operations.
 * Documents are stored in project-specific databases.
 */
export class DocumentService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService,
    private mappers: DatabaseMappersService
  ) {}

  /**
   * Create a new document
   */
  async createDocument(
    projectId: string,
    collectionName: string,
    data: Record<string, unknown>,
    createdBy?: string
  ): Promise<Document> {
    await this.core.ensureReady();

    // Check if collectionName is actually a UUID (collection ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(collectionName);

    // Normalize collection name: URL decode, trim whitespace
    // Collection names from URL parameters may be URL-encoded
    let normalizedCollectionName = collectionName;
    if (!isUUID) {
      // Only decode if it's not a UUID (UUIDs shouldn't be decoded)
      try {
        // Try URL decoding in case the name was URL-encoded
        normalizedCollectionName = decodeURIComponent(collectionName);
      } catch {
        // If decoding fails, use original name
        normalizedCollectionName = collectionName;
      }
    }
    // Trim whitespace
    normalizedCollectionName = normalizedCollectionName.trim();

    // First, get the collection_id using project_id and collection_name (from project DB)
    // Note: collections table stores project_id, but we query by project_id AND name
    // Support both collection names and UUID collection IDs
    
    // Try exact match first - if it's a UUID, query by ID; otherwise query by name
    let collectionResult;
    if (isUUID) {
      collectionResult = await this.dbManager.queryProject(
        projectId,
        "SELECT id, name, project_id FROM collections WHERE id = $1 AND project_id = $2",
        [normalizedCollectionName, projectId]
      );
    } else {
      collectionResult = await this.dbManager.queryProject(
        projectId,
        "SELECT id, name, project_id FROM collections WHERE project_id = $1 AND name = $2",
        [projectId, normalizedCollectionName]
      );
    }

    // If exact match fails, try case-insensitive match BEFORE throwing error
    if (collectionResult.rows.length === 0) {
      logger.debug("database", `Exact match failed for collection '${normalizedCollectionName}', trying case-insensitive match`);
      const allCollectionsResult = await this.dbManager.queryProject(
        projectId,
        "SELECT id, name, project_id FROM collections WHERE project_id = $1",
        [projectId]
      );
      const availableCollections = allCollectionsResult.rows.map(
        (row) => ({ id: row.id, name: row.name, project_id: row.project_id })
      );
      
      const caseInsensitiveMatch = availableCollections.find(
        (col) => {
          const colName = col.name as string | undefined;
          return colName?.toLowerCase() === normalizedCollectionName.toLowerCase();
        }
      );
      
      if (caseInsensitiveMatch) {
        logger.warn("database", `Found case-insensitive match: '${caseInsensitiveMatch.name}' matches '${normalizedCollectionName}'`);
        // Re-query with the actual collection name from database
        collectionResult = await this.dbManager.queryProject(
          projectId,
          "SELECT id, name, project_id FROM collections WHERE project_id = $1 AND name = $2",
          [projectId, caseInsensitiveMatch.name]
        );
      }
    }

    if (collectionResult.rows.length === 0) {
      // Log available collections for debugging
      const allCollectionsResult = await this.dbManager.queryProject(
        projectId,
        "SELECT id, name, project_id FROM collections WHERE project_id = $1",
        [projectId]
      );
      const availableCollections = allCollectionsResult.rows.map(
        (row) => ({ id: row.id, name: row.name, project_id: row.project_id })
      );
      
      logger.error("database", `Collection '${normalizedCollectionName}' not found in project '${projectId}'`, {
        originalName: collectionName,
        normalizedName: normalizedCollectionName,
        availableCollections: availableCollections.map(c => c.name),
      });
      
      // Try case-insensitive match as fallback
      if (availableCollections.length > 0) {
        const caseInsensitiveMatch = availableCollections.find(
          (col) => {
            const colName = col.name as string | undefined;
            return colName?.toLowerCase() === normalizedCollectionName.toLowerCase();
          }
        );
        if (caseInsensitiveMatch) {
          logger.warn("database", `Found case-insensitive match: '${caseInsensitiveMatch.name}' matches '${normalizedCollectionName}'`);
          // Re-query with the actual collection name from database
          const retryResult = await this.dbManager.queryProject(
            projectId,
            "SELECT id, name, project_id FROM collections WHERE project_id = $1 AND name = $2",
            [projectId, caseInsensitiveMatch.name]
          );
          if (retryResult.rows.length > 0) {
            // Use the matched collection - set collectionResult to retryResult for normal flow
            collectionResult.rows = retryResult.rows;
          } else {
            throw new Error(
              `Collection '${normalizedCollectionName}' not found in project '${projectId}'. Available collections: ${availableCollections.map(c => c.name).join(', ')}`
            );
          }
        } else {
          throw new Error(
            `Collection '${normalizedCollectionName}' not found in project '${projectId}'. Available collections: ${availableCollections.map(c => c.name).join(', ')}`
          );
        }
      } else {
        throw new Error(
          `Collection '${normalizedCollectionName}' not found in project '${projectId}'. No collections exist in this project.`
        );
      }
    }

    const collectionId = collectionResult.rows[0]?.id as string;

    // Generate document ID (SQLite doesn't support RETURNING *)
    const documentId = uuidv4();

    // Now insert the document with the collection_id (in project DB)
    // JSON stringify data since SQLite stores it as TEXT
    await this.dbManager.queryProject(
      projectId,
      `INSERT INTO documents (id, collection_id, project_id, data, created_by, updated_by) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        documentId,
        collectionId,
        projectId,
        JSON.stringify(data),
        createdBy || "system",
        createdBy || "system",
      ]
    );

    // Query back the inserted row (SQLite doesn't support RETURNING *)
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM documents WHERE id = $1`,
      [documentId]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error(
        `Failed to retrieve created document with id ${documentId}`
      );
    }

    const row = result.rows[0];
    if (!row) {
      throw new Error("Document not found");
    }
    return this.mappers.mapDocument(row as Record<string, unknown>);
  }

  /**
   * Get document by ID
   */
  async getDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<Document | null> {
    await this.core.ensureReady();
    
    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return null;
    }

    const collectionRow = collectionResult.rows[0];
    if (!collectionRow) {
      return null;
    }
    const collectionId = collectionRow.id as string;

    // Get document from project DB
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM documents WHERE id = $1 AND collection_id = $2",
      [documentId, collectionId]
    );

    const row = result.rows[0];
    return row ? this.mappers.mapDocument(row as Record<string, unknown>) : null;
  }

  /**
   * Get document by ID only (requires searching all projects - inefficient)
   */
  async getDocumentById(_documentId: string): Promise<Document | null> {
    // Without projectId, we need to search all project databases
    // This is inefficient and not recommended
    throw new Error(
      "getDocumentById requires projectId. Use getDocument(projectId, collectionName, documentId) instead."
    );
  }

  /**
   * Get documents with pagination and filtering
   */
  async getDocuments(
    projectId: string,
    collectionName: string,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: "asc" | "desc";
      where?: Record<string, unknown>;
    } = {}
  ): Promise<{ documents: Document[]; total: number }> {
    await this.core.ensureReady();
    
    const {
      limit = 100,
      offset = 0,
      orderBy = "created_at",
      order = "desc",
      where,
    } = options;

    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return { documents: [], total: 0 };
    }

    const collectionRow = collectionResult.rows[0];
    if (!collectionRow) {
      return { documents: [], total: 0 };
    }
    const collectionId = collectionRow.id as string;

    // Build WHERE clause using collection_id instead of collection_name
    let whereClause = "WHERE collection_id = $1";
    const params: unknown[] = [collectionId];

    if (where && Object.keys(where).length > 0) {
      Object.entries(where).forEach(([key, value], _index) => {
        whereClause += ` AND JSON_EXTRACT(data, '$.${key}') = $${
          params.length + 1
        }`;
        params.push(value);
      });
    }

    // Get total count (from project DB)
    const countResult = await this.dbManager.queryProject(
      projectId,
      `SELECT COUNT(*) as count FROM documents ${whereClause}`,
      params
    );
    const total = parseInt(String(countResult.rows[0]?.count || 0));

    // Get documents
    let orderClause = `ORDER BY ${orderBy} ${order.toUpperCase()}`;

    // If ordering by a JSON field (not a database column), use JSON extraction
    if (
      orderBy !== "created_at" &&
      orderBy !== "updated_at" &&
      orderBy !== "id"
    ) {
      // For numeric fields like priority, cast to numeric for proper sorting
      if (
        orderBy === "priority" ||
        orderBy === "score" ||
        orderBy === "rating" ||
        orderBy === "count"
      ) {
        orderClause = `ORDER BY CAST(JSON_EXTRACT(data, '$.${orderBy}') AS NUMERIC) ${order.toUpperCase()}`;
      } else {
        orderClause = `ORDER BY JSON_EXTRACT(data, '$.${orderBy}') ${order.toUpperCase()}`;
      }
    }

    // Get documents from project DB
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM documents ${whereClause} 
       ${orderClause}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      documents: result.rows.map((row) => this.mappers.mapDocument(row)),
      total,
    };
  }

  /**
   * Update document
   */
  async updateDocument(
    projectId: string,
    collectionName: string,
    documentId: string,
    data: Record<string, unknown>,
    updatedBy?: string
  ): Promise<Document | null> {
    await this.core.ensureReady();
    
    // First, get the collection_id using project_id and collection_name (from project DB)
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      throw new Error(
        `Collection '${collectionName}' not found in project '${projectId}'`
      );
    }

    const collectionId = collectionResult.rows[0]?.id as string;

    // Update the document (SQLite doesn't support RETURNING *) - in project DB
    // JSON stringify data since SQLite stores it as TEXT
    await this.dbManager.queryProject(
      projectId,
      `UPDATE documents 
       SET data = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2 
       WHERE id = $3 AND collection_id = $4`,
      [JSON.stringify(data), updatedBy || "system", documentId, collectionId]
    );

    // Query back the updated document
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM documents WHERE id = $1 AND collection_id = $2`,
      [documentId, collectionId]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      throw new Error("Document not found");
    }
    return this.mappers.mapDocument(row as Record<string, unknown>);
  }

  /**
   * Delete document
   */
  async deleteDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<boolean> {
    await this.core.ensureReady();
    
    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return false;
    }

    const row = collectionResult.rows[0];
    if (!row) {
      return false;
    }
    const collectionId = row.id as string;

    // Delete from project DB
    const result = await this.dbManager.queryProject(
      projectId,
      "DELETE FROM documents WHERE id = $1 AND collection_id = $2",
      [documentId, collectionId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Search documents
   */
  async searchDocuments(
    projectId: string,
    collectionName: string,
    searchTerm: string,
    searchFields?: string[],
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Document[]> {
    await this.core.ensureReady();

    const { limit = 50, offset = 0 } = options || {};

    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return [];
    }

    const collectionRow = collectionResult.rows[0];
    if (!collectionRow) {
      return [];
    }
    const collectionId = collectionRow.id as string;

    let query = `SELECT * FROM documents WHERE collection_id = $1`;
    const params: unknown[] = [collectionId];

    if (searchTerm) {
      if (searchFields && searchFields.length > 0) {
        // Search in specific fields (SQLite uses LIKE instead of ILIKE)
        const fieldConditions = searchFields.map((field) => {
          params.push(`%${searchTerm}%`);
          return `JSON_EXTRACT(data, '$.${field}') LIKE $${params.length}`;
        });
        query += ` AND (${fieldConditions.join(" OR ")})`;
      } else {
        // Search in all data
        params.push(`%${searchTerm}%`);
        query += ` AND data LIKE $${params.length}`;
      }
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const result = await this.dbManager.queryProject(projectId, query, params);
    return result.rows.map((row) => this.mappers.mapDocument(row));
  }

  /**
   * Count documents in a collection
   */
  async countDocuments(
    projectId: string,
    collectionName: string
  ): Promise<number> {
    await this.core.ensureReady();

    // Get collection ID first
    const collectionResult = await this.dbManager.queryProject(
      projectId,
      "SELECT id FROM collections WHERE project_id = $1 AND name = $2",
      [projectId, collectionName]
    );

    if (collectionResult.rows.length === 0) {
      return 0;
    }

    const collectionRow = collectionResult.rows[0];
    if (!collectionRow) {
      return 0;
    }
    const collectionId = collectionRow.id as string;

    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count FROM documents WHERE collection_id = $1",
      [collectionId]
    );

    return parseInt(String(result.rows[0]?.count || 0));
  }

  /**
   * Get documents by collection name (alias for getDocuments)
   */
  async getDocumentsByCollection(
    projectId: string,
    collectionName: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Document[]> {
    const result = await this.getDocuments(projectId, collectionName, options || {});
    return result.documents;
  }

  /**
   * Get documents by table (alias for getDocuments)
   */
  async getDocumentsByTable(
    _tableId: string,
    _options?: { limit?: number; offset?: number }
  ): Promise<{ documents: Document[]; total: number }> {
    // First get the table schema to get project_id and table_name (from project DB)
    // We need to search across all project databases, which is inefficient
    // For now, throw an error suggesting to use getDocuments with projectId and collectionName
    throw new Error(
      "getDocumentsByTable requires projectId and collectionName. Use getDocuments(projectId, collectionName, options) instead."
    );
  }
}








