import { PostgreSQLSchemaInspector } from "./postgresql-schema-inspector";
import {
  Collection,
  CollectionField,
  FieldType,
  FieldValidation,
  RelationConfig,
  CollectionIndex,
  FieldDefinition,
} from "./types";

/**
 * Collections Schema Manager
 *
 * Manages dynamic collection schemas that can be created at runtime by admin users.
 * Provides schema validation, type inference, and auto-fix capabilities.
 */
export class CollectionsSchemaManager {
  private collections: Map<string, Collection> = new Map();
  // private _schemaVersion = "1.0.0";
  private schemaInspector: PostgreSQLSchemaInspector;

  constructor(
    private dbConnection: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[] }>;
    },
    private logger: Console = console
  ) {
    this.schemaInspector = new PostgreSQLSchemaInspector(dbConnection, logger);
  }

  /**
   * Create a new collection with custom schema
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
    const collection: Collection = {
      id: this.generateCollectionId(),
      project_id: "default", // Will be set by the caller
      name: collectionData.name,
      schema: {
        fields: collectionData.fields.map((field) => {
          const mappedField: FieldDefinition = {
            name: field.name,
            type: field.type,
            required: field.required ?? false,
            unique: field.unique ?? false,
            description: field.description || "",
          };

          if (field.default !== undefined) {
            mappedField.default_value = field.default;
          }
          if (field.validation !== undefined) {
            mappedField.validation = field.validation;
          }
          if (field.relation !== undefined) {
            mappedField.options = {
              ...mappedField.options,
              reference_collection: field.relation.target_collection || "",
            };
          }

          return mappedField;
        }),
        indexes: collectionData.indexes || [],
      },
      settings: {
        read_permissions: [],
        write_permissions: [],
        delete_permissions: [],
        enable_audit_log: false,
        enable_soft_delete: false,
        enable_versioning: false,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add description if provided
    if (collectionData.description !== undefined) {
      collection.description = collectionData.description;
    }

    // Create the collection in the database
    await this.createCollectionTable(collection);

    // Store in memory
    this.collections.set(collection.id, collection);

    this.logger.info(
      `Created collection: ${collection.name} with ${collection.fields.length} fields`
    );
    return collection;
  }

  /**
   * Update an existing collection schema
   */
  async updateCollection(
    collectionId: string,
    updates: Partial<Collection>
  ): Promise<Collection> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const updatedCollection: Collection = {
      ...collection,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Update the database schema
    await this.updateCollectionTable(collection, updatedCollection);

    // Update in memory
    this.collections.set(collectionId, updatedCollection);

    this.logger.info(`Updated collection: ${updatedCollection.name}`);
    return updatedCollection;
  }

  /**
   * Delete a collection and its table
   */
  async deleteCollection(collectionId: string): Promise<boolean> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    // Drop the table from database
    await this.dropCollectionTable(collection.name);

    // Remove from memory
    this.collections.delete(collectionId);

    this.logger.info(`Deleted collection: ${collection.name}`);
    return true;
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<Collection[]> {
    return Array.from(this.collections.values());
  }

  /**
   * Get a specific collection
   */
  async getCollection(collectionId: string): Promise<Collection | null> {
    return this.collections.get(collectionId) || null;
  }

  /**
   * Validate collection schema against database
   */
  async validateCollectionSchema(collectionId: string): Promise<{
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
    }>;
  }> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const issues: Array<{
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
    }> = [];

    try {
      // Get current database schema for this table
      const dbSchema = await this.schemaInspector.getTableSchema(
        collection.name
      );

      // Check for missing fields
      for (const field of collection.fields) {
        const dbField = dbSchema.fields.find((f) => f.name === field.name);
        if (!dbField) {
          issues.push({
            type: "missing_field",
            field: field.name,
            expected: this.getFieldTypeString(field),
            description: `Field ${field.name} is missing from database`,
          });
        } else if (dbField.type !== this.getFieldTypeString(field)) {
          issues.push({
            type: "wrong_type",
            field: field.name,
            expected: this.getFieldTypeString(field),
            actual: dbField.type,
            description: `Field ${
              field.name
            } has wrong type: expected ${this.getFieldTypeString(field)}, got ${
              dbField.type
            }`,
          });
        }
      }

      // Check for extra fields in database
      for (const dbField of dbSchema.fields) {
        const expectedField = collection.fields.find(
          (f) => f.name === dbField.name
        );
        if (!expectedField) {
          issues.push({
            type: "extra_field",
            field: dbField.name,
            actual: dbField.type,
            description: `Field ${dbField.name} exists in database but not in schema`,
          });
        }
      }

      // Check indexes
      for (const index of collection.indexes || []) {
        const dbIndex = dbSchema.indexes.find((i) => i.name === index.name);
        if (!dbIndex) {
          issues.push({
            type: "missing_index",
            field: index.fields.join(", "),
            description: `Index ${index.name} is missing from database`,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error validating collection schema:`, error);
      issues.push({
        type: "missing_field",
        description: `Failed to validate schema: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Auto-fix collection schema issues
   */
  async autoFixCollectionSchema(collectionId: string): Promise<{
    success: boolean;
    fixesApplied: number;
    details: string[];
  }> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const validation = await this.validateCollectionSchema(collectionId);
    if (validation.isValid) {
      return {
        success: true,
        fixesApplied: 0,
        details: ["Collection schema is already valid"],
      };
    }

    const details: string[] = [];
    let fixesApplied = 0;

    try {
      for (const issue of validation.issues) {
        switch (issue.type) {
          case "missing_field":
            if (issue.field) {
              const field = collection.fields.find(
                (f) => f.name === issue.field
              );
              if (field) {
                await this.addFieldToTable(collection.name, field);
                details.push(`Added missing field: ${issue.field}`);
                fixesApplied++;
              }
            }
            break;

          case "wrong_type":
            if (issue.field && issue.expected) {
              const field = collection.fields.find(
                (f) => f.name === issue.field
              );
              if (field) {
                await this.modifyFieldType(
                  collection.name,
                  issue.field,
                  issue.expected
                );
                details.push(
                  `Fixed field type: ${issue.field} -> ${issue.expected}`
                );
                fixesApplied++;
              }
            }
            break;

          case "missing_index":
            if (issue.field) {
              const index = (collection.indexes || []).find(
                (i) => i.fields.join(", ") === issue.field
              );
              if (index) {
                await this.createIndex(collection.name, index);
                details.push(`Created missing index: ${index.name}`);
                fixesApplied++;
              }
            }
            break;

          case "extra_field":
            // Optionally remove extra fields (dangerous operation)
            if (issue.field && this.shouldRemoveExtraField(issue.field)) {
              await this.removeFieldFromTable(collection.name, issue.field);
              details.push(`Removed extra field: ${issue.field}`);
              fixesApplied++;
            }
            break;
        }
      }

      this.logger.info(
        `Auto-fixed ${fixesApplied} issues for collection: ${collection.name}`
      );

      return {
        success: true,
        fixesApplied,
        details,
      };
    } catch (error) {
      this.logger.error(`Error auto-fixing collection schema:`, error);
      return {
        success: false,
        fixesApplied,
        details: [
          `Auto-fix failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
      };
    }
  }

  /**
   * Generate TypeScript interface from collection schema
   */
  generateTypeScriptInterface(collection: Collection): string {
    let interfaceCode = `export interface ${this.pascalCase(
      collection.name
    )} {\n`;

    for (const field of collection.fields) {
      const type = this.getTypeScriptType(field.type);
      const optional = field.required ? "" : "?";
      const comment = field.description ? ` // ${field.description}` : "";

      interfaceCode += `  ${field.name}${optional}: ${type};${comment}\n`;
    }

    interfaceCode += "}\n";
    return interfaceCode;
  }

  /**
   * Generate all TypeScript interfaces for collections
   */
  generateAllTypeScriptInterfaces(): string {
    let code = "// Auto-generated TypeScript interfaces from collections\n\n";

    for (const collection of this.collections.values()) {
      code += `${this.generateTypeScriptInterface(collection)}\n`;
    }

    return code;
  }

  // Private helper methods

  private generateCollectionId(): string {
    return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createCollectionTable(collection: Collection): Promise<void> {
    const sql = this.buildCreateTableSQL(collection);
    await this.dbConnection.query(sql);
  }

  private async updateCollectionTable(
    oldCollection: Collection,
    newCollection: Collection
  ): Promise<void> {
    // This is a simplified version - in production you'd want more sophisticated migration logic
    for (const field of newCollection.fields) {
      const oldField = oldCollection.fields.find((f) => f.name === field.name);
      if (!oldField) {
        // Add new field
        await this.addFieldToTable(newCollection.name, field);
      } else if (oldField.type !== field.type) {
        // Modify field type
        await this.modifyFieldType(
          newCollection.name,
          field.name,
          this.getFieldTypeString(field)
        );
      }
    }
  }

  private async dropCollectionTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS "${tableName}" CASCADE`;
    await this.dbConnection.query(sql);
  }

  private async addFieldToTable(
    tableName: string,
    field: CollectionField
  ): Promise<void> {
    let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${
      field.name
    }" ${this.getFieldTypeString(field)}`;
    if (!field.required) {
      sql += " NULL";
    }
    if (field.default !== undefined) {
      sql += ` DEFAULT ${this.formatDefaultValue(field.default)}`;
    }
    await this.dbConnection.query(sql);
  }

  private async modifyFieldType(
    tableName: string,
    fieldName: string,
    newType: string
  ): Promise<void> {
    const sql = `ALTER TABLE "${tableName}" ALTER COLUMN "${fieldName}" TYPE ${newType}`;
    await this.dbConnection.query(sql);
  }

  private async removeFieldFromTable(
    tableName: string,
    fieldName: string
  ): Promise<void> {
    const sql = `ALTER TABLE "${tableName}" DROP COLUMN "${fieldName}"`;
    await this.dbConnection.query(sql);
  }

  private async createIndex(
    tableName: string,
    index: CollectionIndex
  ): Promise<void> {
    const unique = index.unique ? "UNIQUE " : "";
    const fields = index.fields.map((f) => `"${f}"`).join(", ");
    const sql = `CREATE ${unique}INDEX "${index.name}" ON "${tableName}" (${fields})`;
    await this.dbConnection.query(sql);
  }

  // private async getTableSchema(_tableName: string): Promise<{
  //   fields: Array<{ name: string; type: string }>;
  //   indexes: Array<{ name: string; fields: string[] }>;
  // }> {
  //   // This would query PostgreSQL system tables to get actual schema
  //   // For now, returning mock data
  //   return {
  //     fields: [],
  //     indexes: [],
  //   };
  // }

  private getFieldTypeString(field: CollectionField): string {
    switch (field.type) {
      case "string":
        return "VARCHAR(255)";
      case "number":
        return "INTEGER";
      case "boolean":
        return "BOOLEAN";
      case "date":
        return "TIMESTAMP";
      case "array":
        return "JSONB";
      case "object":
        return "JSONB";
      case "uniqueID":
        return "UUID";
      case "relation":
        return "UUID";
      case "json":
        return "JSONB";
      case "text":
        return "TEXT";
      default:
        return "VARCHAR(255)";
    }
  }

  private getTypeScriptType(fieldType: FieldType): string {
    switch (fieldType) {
      case "string":
        return "string";
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      case "date":
        return "Date";
      case "array":
        return "unknown[]";
      case "object":
        return "Record<string, unknown>";
      case "uniqueID":
        return "string";
      case "relation":
        return "string";
      case "json":
        return "Record<string, unknown>";
      case "text":
        return "string";
      default:
        return "unknown";
    }
  }

  private formatDefaultValue(value: unknown): string {
    if (typeof value === "string") {
      return `'${value}'`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value === null) {
      return "NULL";
    }
    return `'${JSON.stringify(value)}'`;
  }

  private pascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  private shouldRemoveExtraField(fieldName: string): boolean {
    // Don't remove system fields
    const systemFields = ["id", "created_at", "updated_at", "project_id"];
    return !systemFields.includes(fieldName);
  }

  private buildCreateTableSQL(collection: Collection): string {
    let sql = `CREATE TABLE "${collection.name}" (\n`;

    // Add fields
    const fieldDefinitions = collection.fields.map((field) => {
      let def = `  "${field.name}" ${this.getFieldTypeString(field)}`;
      if (!field.required) {
        def += " NULL";
      }
      if (field.default !== undefined) {
        def += ` DEFAULT ${this.formatDefaultValue(field.default)}`;
      }
      return def;
    });

    sql += fieldDefinitions.join(",\n");
    sql += "\n)";

    return sql;
  }
}
