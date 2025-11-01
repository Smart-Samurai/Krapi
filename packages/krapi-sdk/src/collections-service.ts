import { CollectionsSchemaManager } from "./collections-schema-manager";
import { PostgreSQLSchemaInspector } from "./postgresql-schema-inspector";
import {
  Collection,
  CollectionField,
  FieldType,
  FieldValidation,
  RelationConfig,
  FieldDefinition,
  IndexDefinition,
  CollectionSettings,
} from "./types";

export interface Document {
  id: string;
  collection_id: string;
  project_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  version: number;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface DocumentFilter {
  field_filters?: Record<string, unknown>;
  search?: string;
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  created_by?: string;
  updated_by?: string;
  include_deleted?: boolean;
}

export interface DocumentQueryOptions {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  select_fields?: string[];
}

export interface CreateDocumentRequest {
  data: Record<string, unknown>;
  created_by?: string;
}

export interface CollectionStatistics {
  total_documents: number;
  total_size_bytes: number;
  average_document_size: number;
  field_statistics: Record<
    string,
    {
      null_count: number;
      unique_values: number;
      most_common_values?: Array<{ value: unknown; count: number }>;
    }
  >;
  index_usage: Record<
    string,
    {
      size_bytes: number;
      scans: number;
      last_used?: string;
    }
  >;
}

export interface UpdateDocumentRequest {
  data: Record<string, unknown>;
  updated_by?: string;
}

export interface DatabaseConnection {
  query: (
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
}

/**
 * Collections Service
 *
 * High-level service for managing dynamic collections with schema validation,
 * auto-fixing, and TypeScript interface generation.
 */
export class CollectionsService {
  private schemaManager: CollectionsSchemaManager;
  private schemaInspector: PostgreSQLSchemaInspector;
  private db: DatabaseConnection;

  constructor(
    databaseConnection: DatabaseConnection,
    private logger: Console = console
  ) {
    this.db = databaseConnection;
    this.schemaManager = new CollectionsSchemaManager(
      databaseConnection,
      logger
    );
    this.schemaInspector = new PostgreSQLSchemaInspector(
      databaseConnection,
      logger
    );
  }

  /**
   * Map database row to Document interface
   */
  private mapDocument(row: any): Document {
    return {
      id: row.id,
      collection_id: row.collection_id,
      project_id: row.project_id,
      data: row.data || {},
      version: row.version || 1,
      is_deleted: row.is_deleted || false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by || "system",
      updated_by: row.updated_by || row.created_by || "system",
      deleted_at: row.deleted_at,
      deleted_by: row.deleted_by,
    };
  }

  /**
   * Create a new collection with custom schema
   * Example: Create an "articles" collection with title, content, author fields
   */
  async createCollection(collectionData: {
    name: string;
    description?: string;
    fields: Array<{
      name: string;
      type: FieldType;
      required?: boolean;
      unique?: boolean;
      indexed?: boolean;
      default?: unknown;
      description?: string;
      validation?: FieldValidation;
      relation?: RelationConfig;
    }>;
    indexes?: Array<{
      name: string;
      fields: string[];
      unique?: boolean;
    }>;
  }): Promise<Collection> {
    // Validate collection name
    if (!this.isValidCollectionName(collectionData.name)) {
      throw new Error(
        "Invalid collection name. Use only letters, numbers, and underscores."
      );
    }

    // Check if collection already exists
    const existingCollection = await this.getCollectionByName(
      collectionData.name
    );
    if (existingCollection) {
      throw new Error(`Collection "${collectionData.name}" already exists`);
    }

    // Validate fields
    this.validateCollectionFields(collectionData.fields);

    // Create the collection
    const collection = await this.schemaManager.createCollection(
      collectionData
    );

    this.logger.info(
      `Created collection "${collection.name}" with ${collection.fields.length} fields`
    );
    return collection;
  }

  /**
   * Create a collection from a predefined template
   */
  async createCollectionFromTemplate(
    templateName: string,
    customizations?: {
      name?: string;
      description?: string;
      additionalFields?: Array<{
        name: string;
        type: FieldType;
        required?: boolean;
        unique?: boolean;
        indexed?: boolean;
        description?: string;
      }>;
    }
  ): Promise<Collection> {
    const template = this.getCollectionTemplate(templateName);
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const collectionData = {
      name: customizations?.name || template.name,
      description: customizations?.description || template.description,
      fields: [...template.fields, ...(customizations?.additionalFields || [])],
      indexes: template.indexes,
    };

    return this.createCollection(collectionData);
  }

  /**
   * Update collection schema (add/remove/modify fields)
   */
  async updateCollectionSchema(
    collectionId: string,
    updates: {
      addFields?: Array<{
        name: string;
        type: FieldType;
        required?: boolean;
        unique?: boolean;
        indexed?: boolean;
        default?: unknown;
        description?: string;
        validation?: FieldValidation;
        relation?: RelationConfig;
      }>;
      removeFields?: string[];
      modifyFields?: Array<{
        name: string;
        type?: FieldType;
        required?: boolean;
        unique?: boolean;
        indexed?: boolean;
        default?: unknown;
        description?: string;
        validation?: FieldValidation;
        relation?: RelationConfig;
      }>;
      addIndexes?: Array<{
        name: string;
        fields: string[];
        unique?: boolean;
      }>;
      removeIndexes?: string[];
    }
  ): Promise<Collection> {
    const collection = await this.schemaManager.getCollection(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    // Apply updates
    const updatedFields = [...(collection.fields || [])];
    const updatedIndexes = [...(collection.indexes || [])];

    // Add new fields
    if (updates.addFields) {
      for (const field of updates.addFields) {
        if (updatedFields.find((f) => f.name === field.name)) {
          throw new Error(`Field "${field.name}" already exists`);
        }
        const fieldToAdd: CollectionField = {
          name: field.name,
          type: field.type,
          required: field.required ?? false,
          unique: field.unique ?? false,
          indexed: field.indexed ?? false,
          description: field.description || "",
        };

        if (field.default !== undefined) {
          fieldToAdd.default = field.default;
        }
        if (field.validation !== undefined) {
          fieldToAdd.validation = field.validation;
        }
        if (field.relation !== undefined) {
          fieldToAdd.relation = field.relation as unknown as Record<
            string,
            unknown
          >;
        }

        updatedFields.push(fieldToAdd);
      }
    }

    // Remove fields
    if (updates.removeFields) {
      for (const fieldName of updates.removeFields) {
        const index = updatedFields.findIndex((f) => f.name === fieldName);
        if (index === -1) {
          throw new Error(`Field "${fieldName}" not found`);
        }
        updatedFields.splice(index, 1);
      }
    }

    // Modify fields
    if (updates.modifyFields) {
      for (const modification of updates.modifyFields) {
        const field = updatedFields.find((f) => f.name === modification.name);
        if (!field) {
          throw new Error(`Field "${modification.name}" not found`);
        }

        Object.assign(field, modification);
        if (modification.description !== undefined) {
          field.description = modification.description || "";
        }
      }
    }

    // Add indexes
    if (updates.addIndexes) {
      for (const index of updates.addIndexes) {
        if (updatedIndexes.find((i) => i.name === index.name)) {
          throw new Error(`Index "${index.name}" already exists`);
        }
        updatedIndexes.push(index);
      }
    }

    // Remove indexes
    if (updates.removeIndexes) {
      for (const indexName of updates.removeIndexes) {
        const index = updatedIndexes.findIndex((i) => i.name === indexName);
        if (index === -1) {
          throw new Error(`Index "${indexName}" not found`);
        }
        updatedIndexes.splice(index, 1);
      }
    }

    // Update the collection
    const updatedCollection = await this.schemaManager.updateCollection(
      collectionId,
      {
        fields: updatedFields,
        indexes: updatedIndexes,
        updated_at: new Date().toISOString(),
      }
    );

    this.logger.info(`Updated collection "${updatedCollection.name}" schema`);
    return updatedCollection;
  }

  /**
   * Validate collection schema against database
   */
  async validateCollection(collectionId: string): Promise<{
    isValid: boolean;
    issues: Array<{
      type:
        | "missing_field"
        | "wrong_type"
        | "missing_index"
        | "missing_constraint"
        | "extra_field";
      field?: string;
      expected?: string;
      actual?: string;
      description: string;
      severity: "error" | "warning" | "info";
    }>;
    recommendations: string[];
  }> {
    const collection = await this.schemaManager.getCollection(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const validation = await this.schemaManager.validateCollectionSchema(
      collectionId
    );

    // Add severity levels to issues
    const issuesWithSeverity = validation.issues.map((issue) => ({
      ...issue,
      severity: this.getIssueSeverity(issue.type) as
        | "error"
        | "warning"
        | "info",
    }));

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      validation.issues,
      collection
    );

    return {
      isValid: validation.isValid,
      issues: issuesWithSeverity,
      recommendations,
    };
  }

  /**
   * Auto-fix collection schema issues
   */
  async autoFixCollection(collectionId: string): Promise<{
    success: boolean;
    fixesApplied: number;
    details: string[];
    remainingIssues: number;
  }> {
    const result = await this.schemaManager.autoFixCollectionSchema(
      collectionId
    );

    // Check if there are remaining issues after auto-fix
    const remainingValidation = await this.validateCollection(collectionId);

    return {
      ...result,
      remainingIssues: remainingValidation.issues.length,
    };
  }

  /**
   * Generate TypeScript interface for a collection
   */
  async generateTypeScriptInterface(collectionId: string): Promise<string> {
    const collection = await this.schemaManager.getCollection(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    return this.schemaManager.generateTypeScriptInterface(collection);
  }

  /**
   * Generate all TypeScript interfaces
   */
  async generateAllTypeScriptInterfaces(): Promise<string> {
    return this.schemaManager.generateAllTypeScriptInterfaces();
  }

  /**
   * Get collection health status
   */
  async getCollectionHealth(collectionId: string): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    schemaValid: boolean;
    dataIntegrity: {
      hasNullViolations: boolean;
      hasUniqueViolations: boolean;
      hasForeignKeyViolations: boolean;
      issues: string[];
    };
    tableStats: {
      rowCount: number;
      sizeBytes: number;
      indexSizeBytes: number;
    };
    lastValidated: string;
  }> {
    const collection = await this.schemaManager.getCollection(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const [validation, dataIntegrity, tableStats] = await Promise.all([
      this.validateCollection(collectionId),
      this.schemaInspector.checkTableIntegrity(collection.name),
      this.schemaInspector.getTableStats(collection.name),
    ]);

    const status = this.determineHealthStatus(
      validation.isValid,
      dataIntegrity
    );

    return {
      status,
      schemaValid: validation.isValid,
      dataIntegrity,
      tableStats,
      lastValidated: new Date().toISOString(),
    };
  }

  /**
   * Get all collections with health status
   */
  async getAllCollectionsWithHealth(): Promise<
    Array<
      Collection & {
        health: {
          status: "healthy" | "degraded" | "unhealthy";
          issues: number;
        };
      }
    >
  > {
    const collections = await this.schemaManager.getCollections();
    const collectionsWithHealth = [];

    for (const collection of collections) {
      try {
        const health = await this.getCollectionHealth(collection.id);
        collectionsWithHealth.push({
          ...collection,
          health: {
            status: health.status,
            issues:
              health.dataIntegrity.issues.length + (health.schemaValid ? 0 : 1),
          },
        });
      } catch (error) {
        this.logger.error(
          `Error getting health for collection ${collection.name}:`,
          error
        );
        collectionsWithHealth.push({
          ...collection,
          health: {
            status: "unhealthy" as const,
            issues: 1,
          },
        });
      }
    }

    return collectionsWithHealth;
  }

  /**
   * Get all collections for a specific project
   */
  async getCollectionsByProject(projectId: string): Promise<Collection[]> {
    try {
      const collections = await this.schemaManager.getCollections();
      return collections.filter(
        (collection) => collection.project_id === projectId
      );
    } catch (error) {
      this.logger.error(
        `Error getting collections for project ${projectId}:`,
        error
      );
      throw new Error("Failed to get collections for project");
    }
  }

  /**
   * Get collections by project ID (alias for getCollectionsByProject)
   */
  async getProjectCollections(projectId: string): Promise<Collection[]> {
    return this.getCollectionsByProject(projectId);
  }

  /**
   * Get a collection by ID
   */
  async getCollection(
    projectId: string,
    collectionId: string
  ): Promise<Collection | null> {
    try {
      const collection = await this.schemaManager.getCollection(collectionId);
      if (collection && collection.project_id === projectId) {
        return collection;
      }
      return null;
    } catch (error) {
      this.logger.error("Failed to get collection", {
        error,
        projectId,
        collectionId,
      });
      throw error;
    }
  }

  /**
   * Update a collection
   */
  async updateCollection(
    projectId: string,
    collectionId: string,
    updates: Partial<Collection>
  ): Promise<Collection> {
    try {
      const collection = await this.getCollection(projectId, collectionId);
      if (!collection) {
        throw new Error("Collection not found");
      }
      return await this.schemaManager.updateCollection(collectionId, updates);
    } catch (error) {
      this.logger.error("Failed to update collection", {
        error,
        projectId,
        collectionId,
        updates,
      });
      throw error;
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(
    projectId: string,
    collectionId: string
  ): Promise<boolean> {
    try {
      const collection = await this.getCollection(projectId, collectionId);
      if (!collection) {
        throw new Error("Collection not found");
      }
      return await this.schemaManager.deleteCollection(collectionId);
    } catch (error) {
      this.logger.error("Failed to delete collection", {
        error,
        projectId,
        collectionId,
      });
      throw error;
    }
  }

  // Private helper methods

  private async getCollectionByName(name: string): Promise<Collection | null> {
    const collections = await this.schemaManager.getCollections();
    return collections.find((c) => c.name === name) || null;
  }

  private async getCollectionByNameInProject(
    projectId: string,
    name: string
  ): Promise<Collection | null> {
    try {
      this.logger.info(
        `Looking for collection "${name}" in project "${projectId}"`
      );

      const result = await this.db.query(
        `SELECT * FROM collections WHERE name = $1 AND project_id = $2`,
        [name, projectId]
      );

      this.logger.info(
        `Database query result: ${result.rows.length} rows found`
      );

      if (result.rows.length === 0) {
        this.logger.warn(
          `No collection found with name "${name}" in project "${projectId}"`
        );
        return null;
      }

      const dbCollection = result.rows[0] as Record<string, unknown>;
      this.logger.info(`Found collection:`, dbCollection);

      // Convert database collection to Collection interface
      return {
        id: dbCollection.id as string,
        name: dbCollection.name as string,
        description: dbCollection.description as string,
        project_id: dbCollection.project_id as string,
        fields: (dbCollection.fields as unknown as FieldDefinition[]) || [],
        indexes: (dbCollection.indexes as unknown as IndexDefinition[]) || [],
        schema: {
          fields: (dbCollection.fields as unknown as FieldDefinition[]) || [],
          indexes: (dbCollection.indexes as unknown as IndexDefinition[]) || [],
        },
        settings: (dbCollection.settings as unknown as CollectionSettings) || {
          read_permissions: [],
          write_permissions: [],
          delete_permissions: [],
          enable_audit_log: false,
          enable_soft_delete: false,
          enable_versioning: false,
        },
        created_at: dbCollection.created_at as string,
        updated_at: dbCollection.updated_at as string,
      };
    } catch (error) {
      this.logger.error("Error getting collection by name in project:", error);
      return null;
    }
  }

  private isValidCollectionName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
  }

  private validateCollectionFields(
    fields: Array<{ name: string; type: FieldType }>
  ): void {
    if (fields.length === 0) {
      throw new Error("Collection must have at least one field");
    }

    const fieldNames = new Set<string>();
    for (const field of fields) {
      if (!this.isValidFieldName(field.name)) {
        throw new Error(
          `Invalid field name: "${field.name}". Use only letters, numbers, and underscores.`
        );
      }

      if (fieldNames.has(field.name)) {
        throw new Error(`Duplicate field name: "${field.name}"`);
      }

      fieldNames.add(field.name);
    }
  }

  private isValidFieldName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
  }

  private getIssueSeverity(issueType: string): "error" | "warning" | "info" {
    switch (issueType) {
      case "missing_field":
      case "wrong_type":
        return "error";
      case "missing_index":
      case "missing_constraint":
        return "warning";
      case "extra_field":
        return "info";
      default:
        return "warning";
    }
  }

  private generateRecommendations(
    issues: Array<{
      type: string;
      field?: string;
      description: string;
      severity?: string;
    }>,
    _collection: Collection
  ): string[] {
    const recommendations: string[] = [];

    if (issues.some((i) => i.type === "missing_field")) {
      recommendations.push(
        "Run auto-fix to add missing fields to the database"
      );
    }

    if (issues.some((i) => i.type === "wrong_type")) {
      recommendations.push(
        "Field type mismatches detected. Consider running auto-fix or manually updating field types"
      );
    }

    if (issues.some((i) => i.type === "missing_index")) {
      recommendations.push(
        "Missing indexes detected. Run auto-fix to create them for better performance"
      );
    }

    if (issues.some((i) => i.type === "extra_field")) {
      recommendations.push(
        "Extra fields found in database. Review if they should be removed or added to the schema"
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Collection schema is healthy. No action needed.");
    }

    return recommendations;
  }

  private determineHealthStatus(
    schemaValid: boolean,
    dataIntegrity: {
      hasNullViolations: boolean;
      hasUniqueViolations: boolean;
      hasForeignKeyViolations: boolean;
    }
  ): "healthy" | "degraded" | "unhealthy" {
    if (!schemaValid) {
      return "unhealthy";
    }

    if (
      dataIntegrity.hasNullViolations ||
      dataIntegrity.hasUniqueViolations ||
      dataIntegrity.hasForeignKeyViolations
    ) {
      return "degraded";
    }

    return "healthy";
  }

  private getCollectionTemplate(templateName: string): {
    name: string;
    description: string;
    fields: Array<{
      name: string;
      type: FieldType;
      required?: boolean;
      unique?: boolean;
      indexed?: boolean;
      description?: string;
    }>;
    indexes: Array<{
      name: string;
      fields: string[];
      unique?: boolean;
    }>;
  } | null {
    const templates: Record<
      string,
      {
        name: string;
        description: string;
        fields: Array<{
          name: string;
          type: FieldType;
          required?: boolean;
          unique?: boolean;
          indexed?: boolean;
          description?: string;
        }>;
        indexes: Array<{
          name: string;
          fields: string[];
          unique?: boolean;
        }>;
      }
    > = {
      articles: {
        name: "articles",
        description: "Blog articles or news posts",
        fields: [
          {
            name: "title",
            type: "string" as FieldType,
            required: true,
            indexed: true,
            description: "Article title",
          },
          {
            name: "content",
            type: "text" as FieldType,
            required: true,
            description: "Article content",
          },
          {
            name: "author",
            type: "string" as FieldType,
            required: true,
            indexed: true,
            description: "Author name",
          },
          {
            name: "published_at",
            type: "date" as FieldType,
            description: "Publication date",
          },
          {
            name: "tags",
            type: "array" as FieldType,
            description: "Article tags",
          },
        ],
        indexes: [
          { name: "idx_articles_title", fields: ["title"], unique: false },
          { name: "idx_articles_author", fields: ["author"], unique: false },
          {
            name: "idx_articles_published",
            fields: ["published_at"],
            unique: false,
          },
        ],
      },
      products: {
        name: "products",
        description: "E-commerce products",
        fields: [
          {
            name: "name",
            type: "string" as FieldType,
            required: true,
            indexed: true,
            description: "Product name",
          },
          {
            name: "description",
            type: "text" as FieldType,
            description: "Product description",
          },
          {
            name: "price",
            type: "number" as FieldType,
            required: true,
            description: "Product price",
          },
          {
            name: "category",
            type: "string" as FieldType,
            required: true,
            indexed: true,
            description: "Product category",
          },
          {
            name: "in_stock",
            type: "boolean" as FieldType,
            required: true,
            description: "Stock availability",
          },
          {
            name: "images",
            type: "array" as FieldType,
            description: "Product images",
          },
        ],
        indexes: [
          { name: "idx_products_name", fields: ["name"], unique: false },
          {
            name: "idx_products_category",
            fields: ["category"],
            unique: false,
          },
          { name: "idx_products_price", fields: ["price"], unique: false },
        ],
      },
      users: {
        name: "users",
        description: "User accounts",
        fields: [
          {
            name: "email",
            type: "string" as FieldType,
            required: true,
            unique: true,
            indexed: true,
            description: "User email",
          },
          {
            name: "username",
            type: "string" as FieldType,
            required: true,
            unique: true,
            indexed: true,
            description: "Username",
          },
          {
            name: "first_name",
            type: "string" as FieldType,
            description: "First name",
          },
          {
            name: "last_name",
            type: "string" as FieldType,
            description: "Last name",
          },
          {
            name: "is_active",
            type: "boolean" as FieldType,
            required: true,
            description: "Account status",
          },
          {
            name: "profile_data",
            type: "json" as FieldType,
            description: "Additional profile information",
          },
        ],
        indexes: [
          { name: "idx_users_email", fields: ["email"], unique: true },
          { name: "idx_users_username", fields: ["username"], unique: true },
        ],
      },
    };

    return templates[templateName] || null;
  }

  // ===== DOCUMENT CRUD OPERATIONS =====

  /**
   * Get all documents from a collection with filtering and pagination
   */
  async getDocuments(
    projectId: string,
    collectionName: string,
    filter?: DocumentFilter,
    options?: DocumentQueryOptions
  ): Promise<Document[]> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      let query = `SELECT * FROM documents WHERE collection_id = $1`;
      const params: unknown[] = [collection.id];
      let paramCount = 1;

      // Apply filters
      if (filter) {
        // Note: Soft delete not implemented in current database schema
        // if (!filter.include_deleted) {
        //   query += ` AND is_deleted = false`;
        // }

        if (filter.field_filters) {
          for (const [field, value] of Object.entries(filter.field_filters)) {
            paramCount++;
            query += ` AND data->>'${field}' = $${paramCount}`;
            params.push(value);
          }
        }

        if (filter.search) {
          paramCount++;
          query += ` AND data::text ILIKE $${paramCount}`;
          params.push(`%${filter.search}%`);
        }

        if (filter.created_after) {
          paramCount++;
          query += ` AND created_at >= $${paramCount}`;
          params.push(filter.created_after);
        }

        if (filter.created_before) {
          paramCount++;
          query += ` AND created_at <= $${paramCount}`;
          params.push(filter.created_before);
        }

        if (filter.updated_after) {
          paramCount++;
          query += ` AND updated_at >= $${paramCount}`;
          params.push(filter.updated_after);
        }

        if (filter.updated_before) {
          paramCount++;
          query += ` AND updated_at <= $${paramCount}`;
          params.push(filter.updated_before);
        }

        if (filter.created_by) {
          paramCount++;
          query += ` AND created_by = $${paramCount}`;
          params.push(filter.created_by);
        }

        if (filter.updated_by) {
          paramCount++;
          query += ` AND updated_by = $${paramCount}`;
          params.push(filter.updated_by);
        }
      }

      // Apply sorting
      if (options?.sort_by) {
        const sortOrder = options.sort_order || "asc";
        if (
          options.sort_by === "created_at" ||
          options.sort_by === "updated_at"
        ) {
          query += ` ORDER BY ${options.sort_by} ${sortOrder.toUpperCase()}`;
        } else {
          // For numeric fields, cast to appropriate type for proper sorting
          const field = options.sort_by;
          if (
            field === "priority" ||
            field === "id" ||
            field.includes("count") ||
            field.includes("total")
          ) {
            query += ` ORDER BY (data->>'${field}')::integer ${sortOrder.toUpperCase()}`;
          } else if (
            field === "is_active" ||
            field.includes("enabled") ||
            field.includes("active")
          ) {
            query += ` ORDER BY (data->>'${field}')::boolean ${sortOrder.toUpperCase()}`;
          } else {
            query += ` ORDER BY data->>'${field}' ${sortOrder.toUpperCase()}`;
          }
        }
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      // Apply pagination
      if (options?.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(options.limit);
      }

      if (options?.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows as Document[];
    } catch (error) {
      this.logger.error("Failed to get documents:", error);
      throw new Error("Failed to get documents");
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<Document | null> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      const result = await this.db.query(
        `SELECT * FROM documents WHERE collection_id = $1 AND id = $2`,
        [collection.id, documentId]
      );

      return result.rows.length > 0 ? (result.rows[0] as Document) : null;
    } catch (error) {
      this.logger.error("Failed to get document by ID:", error);
      throw new Error("Failed to get document by ID");
    }
  }

  /**
   * Create a new document in a collection
   */
  async createDocument(
    projectId: string,
    collectionName: string,
    documentData: CreateDocumentRequest
  ): Promise<Document> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      // Validate document data against collection schema
      // Handle the case where data is double-nested due to frontend/backend mismatch
      const actualDocumentData = (documentData.data?.data ||
        documentData.data) as Record<string, unknown>;

      await this.validateDocumentData(collection, actualDocumentData);

      const result = await this.db.query(
        `INSERT INTO documents (collection_id, data, created_by)
         VALUES ($1, $2, $3) RETURNING *`,
        [
          collection.id,
          JSON.stringify(actualDocumentData),
          documentData.created_by || documentData.data?.created_by,
        ]
      );

      this.logger.info(`Created document in collection "${collectionName}"`);
      return result.rows[0] as Document;
    } catch (error) {
      this.logger.error("Failed to create document:", error);

      // Preserve validation error messages for proper error handling
      if (error instanceof Error) {
        if (
          error.message.includes("Required field") ||
          error.message.includes("Invalid type") ||
          error.message.includes("validation") ||
          error.message.includes("missing")
        ) {
          // Re-throw validation errors with their original message
          throw error;
        }
      }

      // For other errors, throw generic message
      throw new Error("Failed to create document");
    }
  }

  /**
   * Update an existing document
   */
  async updateDocument(
    projectId: string,
    collectionName: string,
    documentId: string,
    updateData: UpdateDocumentRequest
  ): Promise<Document | null> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      // Get current document
      const currentDoc = await this.getDocumentById(
        projectId,
        collectionName,
        documentId
      );
      if (!currentDoc) {
        throw new Error("Document not found");
      }

      // Merge data
      const mergedData = { ...currentDoc.data, ...updateData.data };

      // Validate merged data against collection schema
      await this.validateDocumentData(collection, mergedData);

      const result = await this.db.query(
        `UPDATE documents SET data = $1, updated_at = CURRENT_TIMESTAMP
         WHERE collection_id = $2 AND id = $3
         RETURNING *`,
        [JSON.stringify(mergedData), collection.id, documentId]
      );

      this.logger.info(
        `Updated document ${documentId} in collection "${collectionName}"`
      );
      return result.rows.length > 0 ? (result.rows[0] as Document) : null;
    } catch (error) {
      this.logger.error("Failed to update document:", error);

      // Preserve validation error messages for proper error handling
      if (error instanceof Error) {
        if (
          error.message.includes("Required field") ||
          error.message.includes("Invalid type") ||
          error.message.includes("validation") ||
          error.message.includes("missing")
        ) {
          // Re-throw validation errors with their original message
          throw error;
        }
      }

      // For other errors, throw generic message
      throw new Error("Failed to update document");
    }
  }

  /**
   * Delete a document (soft delete)
   */
  async deleteDocument(
    projectId: string,
    collectionName: string,
    documentId: string,
    _deletedBy?: string
  ): Promise<boolean> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      // Note: Implementing as hard delete since soft delete columns don't exist in database schema
      const result = await this.db.query(
        `DELETE FROM documents WHERE collection_id = $1 AND id = $2`,
        [collection.id, documentId]
      );

      this.logger.info(
        `Deleted document ${documentId} from collection "${collectionName}"`
      );
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to delete document:", error);
      throw new Error("Failed to delete document");
    }
  }

  /**
   * Permanently delete a document
   */
  async hardDeleteDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<boolean> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      const result = await this.db.query(
        `DELETE FROM documents WHERE collection_id = $1 AND id = $2`,
        [collection.id, documentId]
      );

      this.logger.info(
        `Hard deleted document ${documentId} from collection "${collectionName}"`
      );
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to hard delete document:", error);
      throw new Error("Failed to hard delete document");
    }
  }

  /**
   * Restore a soft-deleted document
   */
  async restoreDocument(
    projectId: string,
    collectionName: string,
    documentId: string
  ): Promise<boolean> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      // Note: Restore not supported since soft delete doesn't exist in database schema
      // For now, return false to indicate operation not supported
      this.logger.info(
        `Restore not supported - document ${documentId} in collection "${collectionName}"`
      );
      return false;
    } catch (error) {
      this.logger.error("Failed to restore document:", error);
      throw new Error("Failed to restore document");
    }
  }

  /**
   * Count documents in a collection
   */
  async countDocuments(
    projectId: string,
    collectionName: string,
    filter?: DocumentFilter
  ): Promise<number> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      let query = `SELECT COUNT(*) FROM documents WHERE collection_id = $1`;
      const params: unknown[] = [collection.id];
      let paramCount = 1;

      if (filter) {
        // Note: Soft delete not implemented in current database schema
        // if (!filter.include_deleted) {
        //   query += ` AND is_deleted = false`;
        // }

        if (filter.field_filters) {
          for (const [field, value] of Object.entries(filter.field_filters)) {
            paramCount++;
            query += ` AND data->>'${field}' = $${paramCount}`;
            params.push(value);
          }
        }

        if (filter.search) {
          paramCount++;
          query += ` AND data::text ILIKE $${paramCount}`;
          params.push(`%${filter.search}%`);
        }
      }

      const result = await this.db.query(query, params);
      return parseInt((result.rows[0] as { count: string }).count);
    } catch (error) {
      this.logger.error("Failed to count documents:", error);
      throw new Error("Failed to count documents");
    }
  }

  /**
   * Validate document data against collection schema
   */
  private async validateDocumentData(
    collection: Collection,
    data: Record<string, unknown>
  ): Promise<void> {
    this.logger.info(
      `Validating document data against collection "${collection.name}"`
    );
    this.logger.info(`Collection fields:`, collection.schema.fields);
    this.logger.info(`Document data:`, data);

    for (const field of collection.schema.fields) {
      const value = data[field.name];
      this.logger.info(
        `Checking field "${field.name}": required=${field.required}, value=`,
        value
      );

      // Check required fields
      if (field.required && (value === undefined || value === null)) {
        this.logger.error(
          `Required field "${field.name}" is missing from data:`,
          data
        );
        throw new Error(`Required field "${field.name}" is missing`);
      }

      // Validate field types
      if (value !== undefined && value !== null) {
        const isValid = this.validateFieldType(value, field.type);
        if (!isValid) {
          throw new Error(
            `Invalid type for field "${field.name}". Expected ${
              field.type
            }, got ${typeof value}`
          );
        }
      }

      // Validate unique constraints (would need database check)
      if (field.unique && value !== undefined && value !== null) {
        // In a real implementation, you'd check uniqueness against the database
        // This is a placeholder for the validation logic
      }
    }

    this.logger.info(
      `Document validation passed for collection "${collection.name}"`
    );
  }

  /**
   * Validate field type
   */
  private validateFieldType(value: unknown, expectedType: FieldType): boolean {
    switch (expectedType) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && !isNaN(value);
      case "integer":
        return (
          typeof value === "number" && Number.isInteger(value) && !isNaN(value)
        );
      case "boolean":
        return typeof value === "boolean";
      case "date":
        return (
          value instanceof Date ||
          (typeof value === "string" && !isNaN(Date.parse(value)))
        );
      case "array":
        return Array.isArray(value);
      case "json":
        return typeof value === "object" && value !== null;
      case "text":
        return typeof value === "string";
      case "object":
        return typeof value === "object" && value !== null;
      case "uniqueID":
        return (
          typeof value === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value
          )
        );
      case "relation":
        return typeof value === "string"; // Relations are typically stored as ID strings
      default:
        return true; // Unknown types pass validation
    }
  }

  /**
   * Search documents across multiple fields
   */
  async searchDocuments(
    projectId: string,
    collectionName: string,
    searchQuery: string,
    options?: DocumentQueryOptions
  ): Promise<Document[]> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      let query = `SELECT * FROM documents WHERE collection_id = $1`;
      const params: unknown[] = [collection.id];
      let paramCount = 1;

      if (searchQuery) {
        // Search all fields
        paramCount++;
        query += ` AND data::text ILIKE $${paramCount}`;
        params.push(`%${searchQuery}%`);
      }

      // Apply sorting and pagination
      query += ` ORDER BY created_at DESC`;

      if (options?.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(options.limit);
      }

      if (options?.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows as Document[];
    } catch (error) {
      this.logger.error("Failed to search documents:", error);
      throw new Error("Failed to search documents");
    }
  }

  /**
   * Bulk create documents
   */
  async createDocuments(
    projectId: string,
    collectionName: string,
    documents: CreateDocumentRequest[]
  ): Promise<Document[]> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      // Validate all documents first
      for (const doc of documents) {
        await this.validateDocumentData(collection, doc.data);
      }

      // Create all documents
      const results: Document[] = [];
      for (const doc of documents) {
        const result = await this.db.query(
          `INSERT INTO documents (collection_id, data, created_by)
           VALUES ($1, $2, $3) RETURNING *`,
          [collection.id, JSON.stringify(doc.data), doc.created_by || "system"]
        );
        results.push(this.mapDocument(result.rows[0]));
      }

      this.logger.info(
        `Created ${documents.length} documents in collection "${collectionName}"`
      );
      return results;
    } catch (error) {
      this.logger.error("Failed to create documents:", error);

      // Preserve validation error messages for proper error handling
      if (error instanceof Error) {
        if (
          error.message.includes("Required field") ||
          error.message.includes("Invalid type") ||
          error.message.includes("validation") ||
          error.message.includes("missing")
        ) {
          // Re-throw validation errors with their original message
          throw error;
        }
      }

      // For other errors, throw generic message
      throw new Error("Failed to create documents");
    }
  }

  /**
   * Bulk update documents
   */
  async updateDocuments(
    projectId: string,
    collectionName: string,
    updates: Array<{
      id: string;
      data: Record<string, unknown>;
    }>
  ): Promise<Document[]> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}"`
        );
      }

      const results: Document[] = [];
      for (const update of updates) {
        // Get the existing document to merge with new data
        const existingDoc = await this.getDocumentById(
          projectId,
          collectionName,
          update.id
        );
        if (!existingDoc) {
          throw new Error(`Document ${update.id} not found`);
        }

        // Merge existing data with updates
        const mergedData = { ...existingDoc.data, ...update.data };

        // Validate the merged data
        await this.validateDocumentData(collection, mergedData);

        // Update the document
        const result = await this.db.query(
          `UPDATE documents SET data = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [JSON.stringify(mergedData), update.id]
        );
        results.push(result.rows[0] as Document);
      }

      this.logger.info(
        `Updated ${updates.length} documents in collection "${collectionName}"`
      );
      return results;
    } catch (error) {
      this.logger.error("Failed to update documents:", error);

      // Preserve validation error messages for proper error handling
      if (error instanceof Error) {
        if (
          error.message.includes("Required field") ||
          error.message.includes("Invalid type") ||
          error.message.includes("validation") ||
          error.message.includes("missing")
        ) {
          // Re-throw validation errors with their original message
          throw error;
        }
      }

      // For other errors, throw generic message
      throw new Error("Failed to update documents");
    }
  }

  /**
   * Bulk delete documents
   */
  async deleteDocuments(
    projectId: string,
    collectionName: string,
    documentIds: string[]
  ): Promise<boolean[]> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );

      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}"`
        );
      }

      // Use a single bulk delete query instead of individual deletes
      if (documentIds.length === 0) {
        return [];
      }
      // Create placeholders for the IN clause
      const placeholders = documentIds
        .map((_, index) => `$${index + 1}`)
        .join(",");
      const query = `DELETE FROM documents WHERE collection_id = $${
        documentIds.length + 1
      } AND id IN (${placeholders})`;
      const params = [...documentIds, collection.id];

      const result = await this.db.query(query, params);

      // Create results array - we don't know which specific documents were deleted
      // so we'll assume all were deleted if the query succeeded
      const results = documentIds.map(() => true);

      this.logger.info(
        `Bulk deleted ${result.rowCount} documents from collection "${collectionName}"`
      );
      return results;
    } catch (error) {
      this.logger.error("Failed to delete documents:", error);
      throw new Error("Failed to delete documents");
    }
  }

  /**
   * Aggregate documents using pipeline operations
   */
  async aggregateDocuments(
    projectId: string,
    collectionName: string,
    pipeline: Array<Record<string, unknown>>
  ): Promise<Array<Record<string, unknown>>> {
    try {
      const collection = await this.getCollectionByNameInProject(
        projectId,
        collectionName
      );
      if (!collection) {
        throw new Error(
          `Collection "${collectionName}" not found in project ${projectId}`
        );
      }

      // For now, implement basic aggregation operations
      // This is a simplified implementation - in a real system, you'd want more sophisticated aggregation
      let sqlQuery = `SELECT * FROM documents WHERE collection_id = $1`;
      const params: unknown[] = [collection.id];
      let paramCount = 1;

      // Process pipeline stages
      for (const stage of pipeline) {
        if (stage.$match) {
          const matchConditions = [];
          for (const [field, value] of Object.entries(
            stage.$match as Record<string, unknown>
          )) {
            paramCount++;
            matchConditions.push(`data->>'${field}' = $${paramCount}`);
            params.push(value);
          }
          if (matchConditions.length > 0) {
            sqlQuery += ` AND ${matchConditions.join(" AND ")}`;
          }
        }

        if (stage.$sort) {
          const sortFields = Object.entries(
            stage.$sort as Record<string, number>
          );
          if (sortFields.length > 0) {
            const orderClause = sortFields
              .map(
                ([field, order]) =>
                  `data->>'${field}' ${order === 1 ? "ASC" : "DESC"}`
              )
              .join(", ");
            sqlQuery += ` ORDER BY ${orderClause}`;
          }
        }

        if (stage.$limit) {
          paramCount++;
          sqlQuery += ` LIMIT $${paramCount}`;
          params.push(stage.$limit);
        }
      }

      const result = await this.db.query(sqlQuery, params);
      return result.rows.map((row: any) => row.data);
    } catch (error) {
      this.logger.error(`Error aggregating documents: ${error}`);
      throw error;
    }
  }
}
