// import { PostgreSQLSchemaInspector } from "./postgresql-schema-inspector";
import {
  CollectionTypeDefinition,
  CollectionTypeValidationResult,
  CollectionTypeIssue,
  CollectionTypeAutoFixResult,
  CollectionTypeFix,
  CollectionTypeRegistry,
  CollectionFieldType,
  CollectionIndexType,
  CollectionConstraintType,
  CollectionRelationType,
} from "./types";

/**
 * Collections Type Manager
 *
 * Manages collection type definitions, provides type validation,
 * auto-fixing capabilities, and ensures database schema consistency.
 */
export class CollectionsTypeManager {
  private typeRegistry: CollectionTypeRegistry;
  // private _schemaInspector: PostgreSQLSchemaInspector;
  private dbConnection: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[] }>;
  };
  private logger: Console;

  constructor(
    dbConnection: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[] }>;
    },
    logger: Console = console
  ) {
    this.dbConnection = dbConnection;
    this.logger = logger;
    // this._schemaInspector = new PostgreSQLSchemaInspector(dbConnection, logger);
    this.typeRegistry = {
      types: new Map(),
      version: "1.0.0",
      last_sync: new Date().toISOString(),
      auto_fix_enabled: true,
      validation_strict: false,
    };
  }

  /**
   * Register a new collection type definition
   */
  async registerCollectionType(
    typeDefinition: Omit<
      CollectionTypeDefinition,
      "id" | "created_at" | "updated_at"
    >
  ): Promise<CollectionTypeDefinition> {
    const id = this.generateTypeId();
    const now = new Date().toISOString();

    const fullTypeDefinition: CollectionTypeDefinition = {
      ...typeDefinition,
      id,
      created_at: now,
      updated_at: now,
    };

    // Validate the type definition
    const validation = await this.validateTypeDefinition(fullTypeDefinition);
    if (!validation.isValid) {
      throw new Error(
        `Invalid collection type definition: ${validation.issues
          .map((i) => i.description)
          .join(", ")}`
      );
    }

    // Store in registry
    this.typeRegistry.types.set(id, fullTypeDefinition);

    // Store in database
    await this.storeTypeDefinition(fullTypeDefinition);

    this.logger.info(
      `Registered collection type: ${fullTypeDefinition.name} (${id})`
    );
    return fullTypeDefinition;
  }

  /**
   * Update an existing collection type definition
   */
  async updateCollectionType(
    typeId: string,
    updates: Partial<CollectionTypeDefinition>
  ): Promise<CollectionTypeDefinition> {
    const existingType = this.typeRegistry.types.get(typeId);
    if (!existingType) {
      throw new Error(`Collection type ${typeId} not found`);
    }

    const updatedType: CollectionTypeDefinition = {
      ...existingType,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Validate the updated type definition
    const validation = await this.validateTypeDefinition(updatedType);
    if (!validation.isValid) {
      throw new Error(
        `Invalid collection type definition: ${validation.issues
          .map((i) => i.description)
          .join(", ")}`
      );
    }

    // Update in registry
    this.typeRegistry.types.set(typeId, updatedType);

    // Update in database
    await this.updateTypeDefinition(updatedType);

    this.logger.info(
      `Updated collection type: ${updatedType.name} (${typeId})`
    );
    return updatedType;
  }

  /**
   * Get a collection type definition by ID
   */
  async getCollectionType(
    typeId: string
  ): Promise<CollectionTypeDefinition | null> {
    return this.typeRegistry.types.get(typeId) || null;
  }

  /**
   * Get a collection type definition by name
   */
  async getCollectionTypeByName(
    name: string
  ): Promise<CollectionTypeDefinition | null> {
    for (const type of this.typeRegistry.types.values()) {
      if (type.name === name) {
        return type;
      }
    }
    return null;
  }

  /**
   * Get all collection type definitions
   */
  async getAllCollectionTypes(): Promise<CollectionTypeDefinition[]> {
    return Array.from(this.typeRegistry.types.values());
  }

  /**
   * Delete a collection type definition
   */
  async deleteCollectionType(typeId: string): Promise<boolean> {
    const type = this.typeRegistry.types.get(typeId);
    if (!type) {
      throw new Error(`Collection type ${typeId} not found`);
    }

    // Check if any collections are using this type
    const usageCount = await this.getTypeUsageCount(typeId);
    if (usageCount > 0) {
      throw new Error(
        `Cannot delete collection type ${type.name}: ${usageCount} collections are using it`
      );
    }

    // Remove from registry
    this.typeRegistry.types.delete(typeId);

    // Remove from database
    await this.deleteTypeDefinition(typeId);

    this.logger.info(`Deleted collection type: ${type.name} (${typeId})`);
    return true;
  }

  /**
   * Validate a collection type definition
   */
  async validateTypeDefinition(
    typeDefinition: CollectionTypeDefinition
  ): Promise<CollectionTypeValidationResult> {
    const startTime = Date.now();
    const issues: CollectionTypeIssue[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Validate field definitions
      for (const field of typeDefinition.fields) {
        const fieldValidation = this.validateFieldDefinition(field);
        issues.push(...fieldValidation.issues);
        warnings.push(...fieldValidation.warnings);
      }

      // Validate indexes
      for (const index of typeDefinition.indexes) {
        const indexValidation = this.validateIndexDefinition(
          index,
          typeDefinition.fields
        );
        issues.push(...indexValidation.issues);
        warnings.push(...indexValidation.warnings);
      }

      // Validate constraints
      for (const constraint of typeDefinition.constraints) {
        const constraintValidation = this.validateConstraintDefinition(
          constraint,
          typeDefinition.fields
        );
        issues.push(...constraintValidation.issues);
        warnings.push(...constraintValidation.warnings);
      }

      // Validate relations
      for (const relation of typeDefinition.relations) {
        const relationValidation = this.validateRelationDefinition(
          relation,
          typeDefinition.fields
        );
        issues.push(...relationValidation.issues);
        warnings.push(...relationValidation.warnings);
      }

      // Check for duplicate field names
      const fieldNames = typeDefinition.fields.map((f) => f.name);
      const duplicateFields = fieldNames.filter(
        (name, index) => fieldNames.indexOf(name) !== index
      );
      if (duplicateFields.length > 0) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          description: `Duplicate field names: ${duplicateFields.join(", ")}`,
          auto_fixable: false,
        });
      }

      // Check for duplicate index names
      const indexNames = typeDefinition.indexes.map((i) => i.name);
      const duplicateIndexes = indexNames.filter(
        (name, index) => indexNames.indexOf(name) !== index
      );
      if (duplicateIndexes.length > 0) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          description: `Duplicate index names: ${duplicateIndexes.join(", ")}`,
          auto_fixable: false,
        });
      }

      // Generate recommendations
      if (typeDefinition.fields.length === 0) {
        recommendations.push("Collection should have at least one field");
      }

      if (!typeDefinition.fields.some((f) => f.name === "id")) {
        recommendations.push("Consider adding an 'id' field for primary key");
      }

      if (typeDefinition.indexes.length === 0) {
        recommendations.push(
          "Consider adding indexes for frequently queried fields"
        );
      }
    } catch (error) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Validation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        auto_fixable: false,
      });
    }

    const validationDuration = Date.now() - startTime;

    return {
      isValid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
      warnings,
      recommendations,
      validation_duration: validationDuration,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate a field definition
   */
  private validateFieldDefinition(field: CollectionFieldType): {
    issues: CollectionTypeIssue[];
    warnings: string[];
  } {
    const issues: CollectionTypeIssue[] = [];
    const warnings: string[] = [];

    // Check field name
    if (!field.name || field.name.trim() === "") {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: "Field name cannot be empty",
        auto_fixable: false,
      });
    }

    if (field.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Field name '${field.name}' contains invalid characters`,
        auto_fixable: false,
      });
    }

    // Check field type
    if (!field.type) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Field '${field.name}' must have a type`,
        auto_fixable: false,
      });
    }

    // Check PostgreSQL type mapping
    if (!field.postgresql_type) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Field '${field.name}' must have a PostgreSQL type`,
        auto_fixable: false,
      });
    }

    // Check TypeScript type mapping
    if (!field.typescript_type) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Field '${field.name}' must have a TypeScript type`,
        auto_fixable: false,
      });
    }

    // Check validation rules
    if (field.validation) {
      const validationIssues = this.validateFieldValidation(field);
      issues.push(...validationIssues);
    }

    // Check relation configuration
    if (field.relation) {
      const relationIssues = this.validateFieldRelation(field);
      issues.push(...relationIssues);
    }

    return { issues, warnings };
  }

  /**
   * Validate field validation rules
   */
  private validateFieldValidation(
    field: CollectionFieldType
  ): CollectionTypeIssue[] {
    const issues: CollectionTypeIssue[] = [];
    const validation = field.validation;

    if (!validation) return issues;

    // String validations
    if (field.type === "string") {
      if (validation.minLength !== undefined && validation.minLength < 0) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          field: field.name,
          description: `Field '${field.name}' minLength cannot be negative`,
          auto_fixable: true,
        });
      }

      if (validation.maxLength !== undefined && validation.maxLength < 0) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          field: field.name,
          description: `Field '${field.name}' maxLength cannot be negative`,
          auto_fixable: true,
        });
      }

      if (
        validation.minLength !== undefined &&
        validation.maxLength !== undefined &&
        validation.minLength > validation.maxLength
      ) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          field: field.name,
          description: `Field '${field.name}' minLength cannot be greater than maxLength`,
          auto_fixable: true,
        });
      }
    }

    // Number validations
    if (field.type === "number") {
      if (
        validation.min !== undefined &&
        validation.max !== undefined &&
        validation.min > validation.max
      ) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          field: field.name,
          description: `Field '${field.name}' min cannot be greater than max`,
          auto_fixable: true,
        });
      }
    }

    // Array validations
    if (field.type === "array") {
      if (validation.minItems !== undefined && validation.minItems < 0) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          field: field.name,
          description: `Field '${field.name}' minItems cannot be negative`,
          auto_fixable: true,
        });
      }

      if (validation.maxItems !== undefined && validation.maxItems < 0) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          field: field.name,
          description: `Field '${field.name}' maxItems cannot be negative`,
          auto_fixable: true,
        });
      }

      if (
        validation.minItems !== undefined &&
        validation.maxItems !== undefined &&
        validation.minItems > validation.maxItems
      ) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          field: field.name,
          description: `Field '${field.name}' minItems cannot be greater than maxItems`,
          auto_fixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Validate field relation configuration
   */
  private validateFieldRelation(
    field: CollectionFieldType
  ): CollectionTypeIssue[] {
    const issues: CollectionTypeIssue[] = [];
    const relation = field.relation;

    if (!relation) return issues;

    // Check relation type
    if (
      !["one-to-one", "one-to-many", "many-to-one", "many-to-many"].includes(
        relation.type
      )
    ) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        field: field.name,
        description: `Field '${field.name}' has invalid relation type: ${relation.type}`,
        auto_fixable: false,
      });
    }

    // Check target collection
    if (
      !relation.target_collection ||
      relation.target_collection.trim() === ""
    ) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        field: field.name,
        description: `Field '${field.name}' relation must specify target_collection`,
        auto_fixable: false,
      });
    }

    return issues;
  }

  /**
   * Validate index definition
   */
  private validateIndexDefinition(
    index: CollectionIndexType,
    fields: CollectionFieldType[]
  ): {
    issues: CollectionTypeIssue[];
    warnings: string[];
  } {
    const issues: CollectionTypeIssue[] = [];
    const warnings: string[] = [];

    // Check index name
    if (!index.name || index.name.trim() === "") {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: "Index name cannot be empty",
        auto_fixable: false,
      });
    }

    // Check index fields
    if (!index.fields || index.fields.length === 0) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Index '${index.name}' must have at least one field`,
        auto_fixable: false,
      });
    }

    // Check if index fields exist in the collection
    for (const fieldName of index.fields) {
      const fieldExists = fields.some((f) => f.name === fieldName);
      if (!fieldExists) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          field: fieldName,
          description: `Index '${index.name}' references non-existent field: ${fieldName}`,
          auto_fixable: false,
        });
      }
    }

    // Check index type
    if (!["btree", "hash", "gin", "gist"].includes(index.type)) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Index '${index.name}' has invalid type: ${index.type}`,
        auto_fixable: true,
      });
    }

    return { issues, warnings };
  }

  /**
   * Validate constraint definition
   */
  private validateConstraintDefinition(
    constraint: CollectionConstraintType,
    fields: CollectionFieldType[]
  ): {
    issues: CollectionTypeIssue[];
    warnings: string[];
  } {
    const issues: CollectionTypeIssue[] = [];
    const warnings: string[] = [];

    // Check constraint name
    if (!constraint.name || constraint.name.trim() === "") {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: "Constraint name cannot be empty",
        auto_fixable: false,
      });
    }

    // Check constraint type
    if (
      !["primary_key", "foreign_key", "unique", "check", "not_null"].includes(
        constraint.type
      )
    ) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Constraint '${constraint.name}' has invalid type: ${constraint.type}`,
        auto_fixable: false,
      });
    }

    // Check constraint fields
    if (!constraint.fields || constraint.fields.length === 0) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Constraint '${constraint.name}' must have at least one field`,
        auto_fixable: false,
      });
    }

    // Check if constraint fields exist in the collection
    for (const fieldName of constraint.fields) {
      const fieldExists = fields.some((f) => f.name === fieldName);
      if (!fieldExists) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          field: fieldName,
          description: `Constraint '${constraint.name}' references non-existent field: ${fieldName}`,
          auto_fixable: false,
        });
      }
    }

    // Check foreign key reference
    if (constraint.type === "foreign_key" && constraint.reference) {
      if (!constraint.reference.table || !constraint.reference.field) {
        issues.push({
          type: "type_mismatch",
          severity: "error",
          description: `Foreign key constraint '${constraint.name}' must specify table and field`,
          auto_fixable: false,
        });
      }
    }

    return { issues, warnings };
  }

  /**
   * Validate relation definition
   */
  private validateRelationDefinition(
    relation: CollectionRelationType,
    fields: CollectionFieldType[]
  ): {
    issues: CollectionTypeIssue[];
    warnings: string[];
  } {
    const issues: CollectionTypeIssue[] = [];
    const warnings: string[] = [];

    // Check relation name
    if (!relation.name || relation.name.trim() === "") {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: "Relation name cannot be empty",
        auto_fixable: false,
      });
    }

    // Check relation type
    if (
      !["one_to_one", "one_to_many", "many_to_one", "many_to_many"].includes(
        relation.type
      )
    ) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Relation '${relation.name}' has invalid type: ${relation.type}`,
        auto_fixable: false,
      });
    }

    // Check target collection
    if (
      !relation.target_collection ||
      relation.target_collection.trim() === ""
    ) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Relation '${relation.name}' must specify target_collection`,
        auto_fixable: false,
      });
    }

    // Check source field
    if (!relation.source_field || relation.source_field.trim() === "") {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Relation '${relation.name}' must specify source_field`,
        auto_fixable: false,
      });
    }

    // Check target field
    if (!relation.target_field || relation.target_field.trim() === "") {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        description: `Relation '${relation.name}' must specify target_field`,
        auto_fixable: false,
      });
    }

    // Check if source field exists in the collection
    const sourceFieldExists = fields.some(
      (f) => f.name === relation.source_field
    );
    if (!sourceFieldExists) {
      issues.push({
        type: "type_mismatch",
        severity: "error",
        field: relation.source_field,
        description: `Relation '${relation.name}' references non-existent source field: ${relation.source_field}`,
        auto_fixable: false,
      });
    }

    return { issues, warnings };
  }

  /**
   * Auto-fix collection type issues
   */
  async autoFixCollectionType(
    typeId: string
  ): Promise<CollectionTypeAutoFixResult> {
    const startTime = Date.now();
    const type = this.typeRegistry.types.get(typeId);

    if (!type) {
      throw new Error(`Collection type ${typeId} not found`);
    }

    const validation = await this.validateTypeDefinition(type);
    if (validation.isValid) {
      return {
        success: true,
        fixes_applied: 0,
        duration: Date.now() - startTime,
        details: ["Collection type is already valid"],
        applied_fixes: [],
        failed_fixes: [],
        timestamp: new Date().toISOString(),
      };
    }

    const appliedFixes: CollectionTypeFix[] = [];
    const failedFixes: CollectionTypeFix[] = [];
    const details: string[] = [];

    try {
      for (const issue of validation.issues) {
        if (issue.auto_fixable) {
          try {
            const fix = await this.applyAutoFix(type, issue);
            if (fix.success) {
              appliedFixes.push(fix);
              details.push(fix.description);
            } else {
              failedFixes.push(fix);
            }
          } catch (error) {
            const failedFix: CollectionTypeFix = {
              type: "modify_field",
              ...(issue.field !== undefined && { field: issue.field }),
              description: `Failed to fix: ${issue.description}`,
              sql: "",
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
              execution_time: 0,
            };
            failedFixes.push(failedFix);
          }
        }
      }

      // Update the type definition if fixes were applied
      if (appliedFixes.length > 0) {
        const updatedType = await this.updateCollectionType(typeId, {
          updated_at: new Date().toISOString(),
        });

        // Update the registry
        this.typeRegistry.types.set(typeId, updatedType);
      }
    } catch (error) {
      this.logger.error(`Error auto-fixing collection type ${typeId}:`, error);
    }

    const duration = Date.now() - startTime;

    return {
      success: appliedFixes.length > 0,
      fixes_applied: appliedFixes.length,
      duration,
      details,
      applied_fixes: appliedFixes,
      failed_fixes: failedFixes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Apply an auto-fix for a specific issue
   */
  private async applyAutoFix(
    type: CollectionTypeDefinition,
    issue: CollectionTypeIssue
  ): Promise<CollectionTypeFix> {
    const startTime = Date.now();
    const sql = "";
    let description = "";

    try {
      switch (issue.type) {
        case "type_mismatch":
          if (issue.field) {
            const field = type.fields.find((f) => f.name === issue.field);
            if (field) {
              // Fix field validation issues
              if (
                issue.description.includes("minLength") &&
                field.validation?.minLength !== undefined
              ) {
                if (field.validation.minLength < 0) {
                  field.validation.minLength = 0;
                  description = `Fixed negative minLength for field ${issue.field}`;
                }
              }

              if (
                issue.description.includes("maxLength") &&
                field.validation?.maxLength !== undefined
              ) {
                if (field.validation.maxLength < 0) {
                  field.validation.maxLength = 255;
                  description = `Fixed negative maxLength for field ${issue.field}`;
                }
              }

              if (
                issue.description.includes("minItems") &&
                field.validation?.minItems !== undefined
              ) {
                if (field.validation.minItems < 0) {
                  field.validation.minItems = 0;
                  description = `Fixed negative minItems for field ${issue.field}`;
                }
              }

              if (
                issue.description.includes("maxItems") &&
                field.validation?.maxItems !== undefined
              ) {
                if (field.validation.maxItems < 0) {
                  field.validation.maxItems = 1000;
                  description = `Fixed negative maxItems for field ${issue.field}`;
                }
              }
            }
          }
          break;

        default:
          description = `No auto-fix available for issue type: ${issue.type}`;
          break;
      }

      const executionTime = Date.now() - startTime;

      return {
        type: "modify_field",
        ...(issue.field !== undefined && { field: issue.field }),
        description: description || `Fixed issue: ${issue.description}`,
        sql,
        success: true,
        execution_time: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        type: "modify_field",
        ...(issue.field !== undefined && { field: issue.field }),
        description: `Failed to fix: ${issue.description}`,
        sql,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        execution_time: executionTime,
      };
    }
  }

  /**
   * Get the count of collections using a specific type
   */
  private async getTypeUsageCount(typeId: string): Promise<number> {
    try {
      const result = await this.dbConnection.query(
        "SELECT COUNT(*) as count FROM collections WHERE type_definition_id = $1",
        [typeId]
      );
      return parseInt((result.rows?.[0] as { count: string })?.count || "0");
    } catch (error) {
      this.logger.warn(`Failed to get type usage count:`, error);
      return 0;
    }
  }

  /**
   * Store a type definition in the database
   */
  private async storeTypeDefinition(
    typeDefinition: CollectionTypeDefinition
  ): Promise<void> {
    try {
      await this.dbConnection.query(
        `INSERT INTO collection_type_definitions (
          id, name, version, fields, indexes, constraints, relations, metadata, 
          created_at, updated_at, created_by, project_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          typeDefinition.id,
          typeDefinition.name,
          typeDefinition.version,
          JSON.stringify(typeDefinition.fields),
          JSON.stringify(typeDefinition.indexes),
          JSON.stringify(typeDefinition.constraints),
          JSON.stringify(typeDefinition.relations),
          JSON.stringify(typeDefinition.metadata),
          typeDefinition.created_at,
          typeDefinition.updated_at,
          typeDefinition.created_by,
          typeDefinition.project_id,
        ]
      );
    } catch (error) {
      this.logger.error(`Failed to store type definition:`, error);
      throw error;
    }
  }

  /**
   * Update a type definition in the database
   */
  private async updateTypeDefinition(
    typeDefinition: CollectionTypeDefinition
  ): Promise<void> {
    try {
      await this.dbConnection.query(
        `UPDATE collection_type_definitions SET
          name = $2, version = $3, fields = $4, indexes = $5, constraints = $6,
          relations = $7, metadata = $8, updated_at = $9
        WHERE id = $1`,
        [
          typeDefinition.id,
          typeDefinition.name,
          typeDefinition.version,
          JSON.stringify(typeDefinition.fields),
          JSON.stringify(typeDefinition.indexes),
          JSON.stringify(typeDefinition.constraints),
          JSON.stringify(typeDefinition.relations),
          JSON.stringify(typeDefinition.metadata),
          typeDefinition.updated_at,
        ]
      );
    } catch (error) {
      this.logger.error(`Failed to update type definition:`, error);
      throw error;
    }
  }

  /**
   * Delete a type definition from the database
   */
  private async deleteTypeDefinition(typeId: string): Promise<void> {
    try {
      await this.dbConnection.query(
        "DELETE FROM collection_type_definitions WHERE id = $1",
        [typeId]
      );
    } catch (error) {
      this.logger.error(`Failed to delete type definition:`, error);
      throw error;
    }
  }

  /**
   * Generate a unique type ID
   */
  private generateTypeId(): string {
    return `type_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the type registry
   */
  getTypeRegistry(): CollectionTypeRegistry {
    return this.typeRegistry;
  }

  /**
   * Set auto-fix enabled/disabled
   */
  setAutoFixEnabled(enabled: boolean): void {
    this.typeRegistry.auto_fix_enabled = enabled;
  }

  /**
   * Set validation strict mode
   */
  setValidationStrict(strict: boolean): void {
    this.typeRegistry.validation_strict = strict;
  }
}
