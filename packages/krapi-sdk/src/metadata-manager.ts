/**
 * Metadata Manager
 * 
 * Manages collection metadata including custom fields, validation rules, and schema versions.
 * Provides metadata persistence and querying capabilities.
 * 
 * @module metadata-manager
 * @example
 * const manager = new MetadataManager(dbConnection, console);
 * await manager.initializeMetadataTables();
 * const field = await manager.addCustomField({ collection_name: 'users', field_name: 'age', field_type: 'number' });
 */
import { DatabaseConnection, Logger } from "./core";

/**
 * Custom Field Interface
 * 
 * @interface CustomField
 * @property {string} id - Field ID
 * @property {string} collection_name - Collection name
 * @property {string} field_name - Field name
 * @property {string} field_type - Field type
 * @property {string} [display_name] - Display name
 * @property {string} [description] - Field description
 * @property {boolean} required - Whether field is required
 * @property {boolean} unique - Whether field is unique
 * @property {unknown} [default_value] - Default value
 * @property {Record<string, unknown>} [validation] - Validation rules
 * @property {Record<string, unknown>} [metadata] - Additional metadata
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 */
export interface CustomField {
  id: string;
  collection_name: string;
  field_name: string;
  field_type: string;
  display_name?: string;
  description?: string;
  required: boolean;
  unique: boolean;
  default_value?: unknown;
  validation?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Collection Metadata Interface
 * 
 * @interface CollectionMetadata
 * @property {string} id - Metadata ID
 * @property {string} collection_name - Collection name
 * @property {string} version - Schema version
 * @property {Record<string, unknown>} schema - Collection schema
 * @property {CustomField[]} custom_fields - Custom fields
 * @property {Record<string, unknown>} validation_rules - Validation rules
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 */
export interface CollectionMetadata {
  id: string;
  collection_name: string;
  version: string;
  schema: Record<string, unknown>;
  custom_fields: CustomField[];
  validation_rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Metadata Query Interface
 * 
 * @interface MetadataQuery
 * @property {string} [collection_name] - Filter by collection name
 * @property {string} [field_type] - Filter by field type
 * @property {boolean} [required] - Filter by required status
 * @property {boolean} [unique] - Filter by unique status
 */
export interface MetadataQuery {
  collection_name?: string;
  field_type?: string;
  required?: boolean;
  unique?: boolean;
}

/**
 * Metadata Manager Class
 * 
 * Manages collection metadata including custom fields and validation rules.
 * 
 * @class MetadataManager
 * @example
 * const manager = new MetadataManager(dbConnection, console);
 * await manager.initializeMetadataTables();
 * const metadata = await manager.getCollectionMetadata('users');
 */
export class MetadataManager {
  private db: DatabaseConnection;
  private logger: Logger;
  private initialized = false;

  constructor(
    databaseConnection: DatabaseConnection,
    logger: Logger = console
  ) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  /**
   * Initialize metadata tables
   */
  async initializeMetadataTables(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Wait for admin_users table to exist
      await this.waitForTable("admin_users");

      // Create custom_fields table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS custom_fields (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          collection_name VARCHAR(255) NOT NULL,
          field_name VARCHAR(255) NOT NULL,
          field_type VARCHAR(100) NOT NULL,
          display_name VARCHAR(255),
          description TEXT,
          required BOOLEAN DEFAULT false,
          "unique" BOOLEAN DEFAULT false,
          default_value JSONB,
          validation JSONB,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(collection_name, field_name)
        )
      `);

      // Create collection_metadata table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS collection_metadata (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          collection_name VARCHAR(255) NOT NULL UNIQUE,
          version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
          schema JSONB NOT NULL DEFAULT '{}',
          custom_fields JSONB DEFAULT '[]',
          validation_rules JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      this.initialized = true;
      this.logger.info("Metadata tables initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize metadata tables:", error);
      throw error;
    }
  }

  /**
   * Wait for a table to exist
   */
  private async waitForTable(tableName: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const result = await this.db.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
          [tableName]
        );

        if (
          result.rows?.[0] &&
          (result.rows[0] as Record<string, unknown>).exists
        ) {
          return;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error(
      `Table ${tableName} not found after ${maxAttempts} attempts`
    );
  }

  /**
   * Add a custom field to a collection
   */
  async addCustomField(
    field: Omit<CustomField, "id" | "created_at" | "updated_at">
  ): Promise<CustomField> {
    await this.ensureInitialized();

    try {
      const result = await this.db.query(
        `
        INSERT INTO custom_fields (
          collection_name, field_name, field_type, display_name, description,
          required, "unique", default_value, validation, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
        [
          field.collection_name,
          field.field_name,
          field.field_type,
          field.display_name,
          field.description,
          field.required,
          field.unique,
          JSON.stringify(field.default_value || null),
          JSON.stringify(field.validation || {}),
          JSON.stringify(field.metadata || {}),
        ]
      );

      return result.rows[0] as CustomField;
    } catch (error) {
      this.logger.error("Failed to add custom field:", error);
      throw error;
    }
  }

  /**
   * Update a custom field
   */
  async updateCustomField(
    fieldId: string,
    updates: Partial<Omit<CustomField, "id" | "created_at" | "updated_at">>
  ): Promise<CustomField | null> {
    await this.ensureInitialized();

    try {
      const setClauses: string[] = [];
      const params: unknown[] = [];
      let paramCount = 0;

      if (updates.field_name !== undefined) {
        paramCount++;
        setClauses.push(`field_name = $${paramCount}`);
        params.push(updates.field_name);
      }

      if (updates.field_type !== undefined) {
        paramCount++;
        setClauses.push(`field_type = $${paramCount}`);
        params.push(updates.field_type);
      }

      if (updates.display_name !== undefined) {
        paramCount++;
        setClauses.push(`display_name = $${paramCount}`);
        params.push(updates.display_name);
      }

      if (updates.description !== undefined) {
        paramCount++;
        setClauses.push(`description = $${paramCount}`);
        params.push(updates.description);
      }

      if (updates.required !== undefined) {
        paramCount++;
        setClauses.push(`required = $${paramCount}`);
        params.push(updates.required);
      }

      if (updates.unique !== undefined) {
        paramCount++;
        setClauses.push(`"unique" = $${paramCount}`);
        params.push(updates.unique);
      }

      if (updates.default_value !== undefined) {
        paramCount++;
        setClauses.push(`default_value = $${paramCount}`);
        params.push(JSON.stringify(updates.default_value));
      }

      if (updates.validation !== undefined) {
        paramCount++;
        setClauses.push(`validation = $${paramCount}`);
        params.push(JSON.stringify(updates.validation));
      }

      if (updates.metadata !== undefined) {
        paramCount++;
        setClauses.push(`metadata = $${paramCount}`);
        params.push(JSON.stringify(updates.metadata));
      }

      if (setClauses.length === 0) {
        return null;
      }

      paramCount++;
      setClauses.push(`updated_at = $${paramCount}`);
      params.push(new Date().toISOString());

      paramCount++;
      params.push(fieldId);

      const result = await this.db.query(
        `
        UPDATE custom_fields 
        SET ${setClauses.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `,
        params
      );

      return result.rows.length > 0 ? (result.rows[0] as CustomField) : null;
    } catch (error) {
      this.logger.error("Failed to update custom field:", error);
      throw error;
    }
  }

  /**
   * Remove a custom field
   */
  async removeCustomField(fieldId: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const result = await this.db.query(
        "DELETE FROM custom_fields WHERE id = $1 RETURNING id",
        [fieldId]
      );

      return result.rows.length > 0;
    } catch (error) {
      this.logger.error("Failed to remove custom field:", error);
      throw error;
    }
  }

  /**
   * Get custom fields for a collection
   */
  async getCustomFields(collectionName?: string): Promise<CustomField[]> {
    await this.ensureInitialized();

    try {
      let query = "SELECT * FROM custom_fields";
      const params: unknown[] = [];

      if (collectionName) {
        query += " WHERE collection_name = $1";
        params.push(collectionName);
      }

      query += " ORDER BY created_at DESC";

      const result = await this.db.query(query, params);
      return result.rows as CustomField[];
    } catch (error) {
      this.logger.error("Failed to get custom fields:", error);
      throw error;
    }
  }

  /**
   * Get collection metadata
   */
  async getCollectionMetadata(
    collectionName: string
  ): Promise<CollectionMetadata | null> {
    await this.ensureInitialized();

    try {
      const result = await this.db.query(
        "SELECT * FROM collection_metadata WHERE collection_name = $1",
        [collectionName]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const metadata = result.rows[0] as CollectionMetadata;

      // Parse JSON fields
      metadata.custom_fields = metadata.custom_fields || [];
      metadata.schema = metadata.schema || {};
      metadata.validation_rules = metadata.validation_rules || {};

      return metadata;
    } catch (error) {
      this.logger.error("Failed to get collection metadata:", error);
      throw error;
    }
  }

  /**
   * Update collection metadata version
   */
  async updateCollectionMetadataVersion(
    collectionName: string,
    version: string,
    schema?: Record<string, unknown>
  ): Promise<CollectionMetadata> {
    await this.ensureInitialized();

    try {
      const result = await this.db.query(
        `
        INSERT INTO collection_metadata (collection_name, version, schema, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (collection_name) 
        DO UPDATE SET 
          version = EXCLUDED.version,
          schema = EXCLUDED.schema,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `,
        [
          collectionName,
          version,
          JSON.stringify(schema || {}),
          new Date().toISOString(),
        ]
      );

      return result.rows[0] as CollectionMetadata;
    } catch (error) {
      this.logger.error("Failed to update collection metadata version:", error);
      throw error;
    }
  }

  /**
   * Log validation change
   */
  async logValidationChange(
    collectionName: string,
    changeType: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.db.query(
        `
        INSERT INTO collection_metadata (collection_name, validation_rules, updated_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (collection_name) 
        DO UPDATE SET 
          validation_rules = EXCLUDED.validation_rules,
          updated_at = EXCLUDED.updated_at
      `,
        [
          collectionName,
          JSON.stringify({
            [changeType]: details,
            timestamp: new Date().toISOString(),
          }),
          new Date().toISOString(),
        ]
      );
    } catch (error) {
      this.logger.error("Failed to log validation change:", error);
      throw error;
    }
  }

  /**
   * Validate a document against custom fields
   */
  async validateDocument(
    collectionName: string,
    document: Record<string, unknown>
  ): Promise<{ isValid: boolean; errors: string[] }> {
    await this.ensureInitialized();

    try {
      const customFields = await this.getCustomFields(collectionName);
      const errors: string[] = [];

      for (const field of customFields) {
        const value = document[field.field_name];

        // Check required fields
        if (
          field.required &&
          (value === undefined || value === null || value === "")
        ) {
          errors.push(`Field '${field.field_name}' is required`);
          continue;
        }

        // Skip validation for undefined values
        if (value === undefined || value === null) {
          continue;
        }

        // Validate field type
        const typeValid = this.validateFieldType(field.field_type, value);
        if (!typeValid) {
          errors.push(
            `Field '${field.field_name}' has invalid type. Expected ${
              field.field_type
            }, got ${typeof value}`
          );
        }

        // Validate field rules
        if (field.validation) {
          const ruleErrors = this.validateFieldRules(
            field.field_name,
            value,
            field.validation
          );
          errors.push(...ruleErrors);
        }

        // Check uniqueness if required
        if (field.unique) {
          const isUnique = await this.checkFieldUniqueness(
            collectionName,
            field.field_name
          );
          if (!isUnique) {
            errors.push(`Field '${field.field_name}' must be unique`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error("Failed to validate document:", error);
      throw error;
    }
  }

  /**
   * Validate field type
   */
  private validateFieldType(expectedType: string, value: unknown): boolean {
    switch (expectedType.toLowerCase()) {
      case "string":
      case "text":
      case "varchar":
        return typeof value === "string";
      case "integer":
      case "int":
      case "bigint":
        return Number.isInteger(value);
      case "decimal":
      case "numeric":
      case "real":
      case "double":
        return typeof value === "number";
      case "boolean":
      case "bool":
        return typeof value === "boolean";
      case "date":
      case "timestamp":
        return value instanceof Date || typeof value === "string";
      case "json":
      case "jsonb":
        return typeof value === "object" && value !== null;
      case "array":
        return Array.isArray(value);
      default:
        return true; // Unknown types are considered valid
    }
  }

  /**
   * Validate field rules
   */
  private validateFieldRules(
    fieldName: string,
    value: unknown,
    rules: Record<string, unknown>
  ): string[] {
    const errors: string[] = [];

    if (
      rules.min_length &&
      typeof value === "string" &&
      value.length < (rules.min_length as number)
    ) {
      errors.push(
        `Field '${fieldName}' must be at least ${
          rules.min_length as number
        } characters long`
      );
    }

    if (
      rules.max_length &&
      typeof value === "string" &&
      value.length > (rules.max_length as number)
    ) {
      errors.push(
        `Field '${fieldName}' must be at most ${
          rules.max_length as number
        } characters long`
      );
    }

    if (
      rules.min_value &&
      typeof value === "number" &&
      value < (rules.min_value as number)
    ) {
      errors.push(
        `Field '${fieldName}' must be at least ${rules.min_value as number}`
      );
    }

    if (
      rules.max_value &&
      typeof value === "number" &&
      value > (rules.max_value as number)
    ) {
      errors.push(
        `Field '${fieldName}' must be at most ${rules.max_value as number}`
      );
    }

    if (rules.pattern && typeof value === "string") {
      const regex = new RegExp(rules.pattern as string);
      if (!regex.test(value)) {
        errors.push(
          `Field '${fieldName}' does not match pattern ${
            rules.pattern as string
          }`
        );
      }
    }

    if (
      rules.allowed_values &&
      !(rules.allowed_values as unknown[]).includes(value)
    ) {
      errors.push(
        `Field '${fieldName}' must be one of: ${(
          rules.allowed_values as unknown[]
        ).join(", ")}`
      );
    }

    return errors;
  }

  /**
   * Check field uniqueness
   */
  private async checkFieldUniqueness(
    collectionName: string,
    fieldName: string
  ): Promise<boolean> {
    try {
      // This is a simplified check - in a real implementation,
      // you'd need to check against the actual collection table
      const result = await this.db.query(
        `
        SELECT COUNT(*) as count FROM custom_fields 
        WHERE collection_name = $1 AND field_name = $2 AND "unique" = true
      `,
        [collectionName, fieldName]
      );

      return (
        parseInt(
          ((result.rows[0] as Record<string, unknown>)?.count as string) || "0"
        ) === 0
      );
    } catch (error) {
      this.logger.error("Failed to check field uniqueness:", error);
      return false;
    }
  }

  /**
   * Ensure the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeMetadataTables();
    }
  }
}
