import { PostgreSQLSchemaInspector } from "./postgresql-schema-inspector";
import {
  CollectionTypeDefinition,
  CollectionTypeValidationResult,
  CollectionTypeIssue,
  CollectionTypeAutoFixResult,
  CollectionTypeFix,
  CollectionFieldType,
  CollectionIndexType,
  CollectionConstraintType,
} from "./types";

/**
 * Collections Type Validator
 *
 * Validates collection type definitions against actual database schema,
 * detects mismatches, and provides auto-fixing capabilities.
 */
export class CollectionsTypeValidator {
  private schemaInspector: PostgreSQLSchemaInspector;
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
    this.schemaInspector = new PostgreSQLSchemaInspector(dbConnection, logger);
  }

  /**
   * Validate a collection type definition against the actual database schema
   */
  async validateCollectionType(
    typeDefinition: CollectionTypeDefinition,
    tableName: string
  ): Promise<CollectionTypeValidationResult> {
    const startTime = Date.now();
    const issues: CollectionTypeIssue[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if the table exists
      const tableExists = await this.schemaInspector.tableExists(tableName);
      if (!tableExists) {
        issues.push({
          type: "missing_field",
          severity: "error",
          description: `Table '${tableName}' does not exist in the database`,
          auto_fixable: true,
        });
      } else {
        // Get actual database schema
        const dbSchema = await this.schemaInspector.getTableSchema(tableName);

        // Validate fields
        const fieldValidation = await this.validateFields(
          typeDefinition.fields,
          dbSchema.fields
        );
        issues.push(...fieldValidation.issues);
        warnings.push(...fieldValidation.warnings);

        // Validate indexes
        const indexValidation = await this.validateIndexes(
          typeDefinition.indexes,
          dbSchema.indexes
        );
        issues.push(...indexValidation.issues);
        warnings.push(...indexValidation.warnings);

        // Validate constraints
        const constraintValidation = await this.validateConstraints(
          typeDefinition.constraints,
          dbSchema.constraints
        );
        issues.push(...constraintValidation.issues);
        warnings.push(...constraintValidation.warnings);

        // Check for extra fields in database
        const extraFieldIssues = this.checkExtraFields(
          typeDefinition.fields,
          dbSchema.fields
        );
        issues.push(...extraFieldIssues);

        // Check for extra indexes in database
        const extraIndexIssues = this.checkExtraIndexes(
          typeDefinition.indexes,
          dbSchema.indexes
        );
        issues.push(...extraIndexIssues);
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

      // Check for potential performance issues
      const performanceIssues = this.checkPerformanceIssues(typeDefinition);
      warnings.push(...performanceIssues);
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
   * Validate field definitions against database schema
   */
  private async validateFields(
    expectedFields: CollectionFieldType[],
    actualFields: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default?: string;
    }>
  ): Promise<{
    issues: CollectionTypeIssue[];
    warnings: string[];
  }> {
    const issues: CollectionTypeIssue[] = [];
    const warnings: string[] = [];

    for (const expectedField of expectedFields) {
      const actualField = actualFields.find(
        (f) => f.name === expectedField.name
      );

      if (!actualField) {
        issues.push({
          type: "missing_field",
          severity: "error",
          field: expectedField.name,
          expected: expectedField.postgresql_type,
          description: `Field '${expectedField.name}' is missing from database`,
          auto_fixable: true,
        });
      } else {
        // Check field type
        if (actualField.type !== expectedField.postgresql_type) {
          issues.push({
            type: "wrong_type",
            severity: "error",
            field: expectedField.name,
            expected: expectedField.postgresql_type,
            actual: actualField.type,
            description: `Field '${expectedField.name}' has wrong type: expected ${expectedField.postgresql_type}, got ${actualField.type}`,
            auto_fixable: true,
          });
        }

        // Check nullable constraint
        if (expectedField.required && actualField.nullable) {
          issues.push({
            type: "missing_constraint",
            severity: "error",
            field: expectedField.name,
            description: `Field '${expectedField.name}' should be NOT NULL but is nullable in database`,
            auto_fixable: true,
          });
        }

        // Check default value
        if (
          expectedField.default !== undefined &&
          actualField.default !== expectedField.default?.toString()
        ) {
          warnings.push(
            `Field '${expectedField.name}' has different default value: expected ${expectedField.default}, got ${actualField.default}`
          );
        }
      }
    }

    return { issues, warnings };
  }

  /**
   * Validate index definitions against database schema
   */
  private async validateIndexes(
    expectedIndexes: CollectionIndexType[],
    actualIndexes: Array<{ name: string; fields: string[]; unique: boolean }>
  ): Promise<{
    issues: CollectionTypeIssue[];
    warnings: string[];
  }> {
    const issues: CollectionTypeIssue[] = [];
    const warnings: string[] = [];

    for (const expectedIndex of expectedIndexes) {
      const actualIndex = actualIndexes.find(
        (i) => i.name === expectedIndex.name
      );

      if (!actualIndex) {
        issues.push({
          type: "missing_index",
          severity: "error",
          field: expectedIndex.fields.join(", "),
          description: `Index '${expectedIndex.name}' is missing from database`,
          auto_fixable: true,
        });
      } else {
        // Check index fields
        const fieldsMatch = this.arraysEqual(
          expectedIndex.fields,
          actualIndex.fields
        );
        if (!fieldsMatch) {
          issues.push({
            type: "wrong_type",
            severity: "error",
            field: expectedIndex.fields.join(", "),
            expected: expectedIndex.fields.join(", "),
            actual: actualIndex.fields.join(", "),
            description: `Index '${
              expectedIndex.name
            }' has wrong fields: expected [${expectedIndex.fields.join(
              ", "
            )}], got [${actualIndex.fields.join(", ")}]`,
            auto_fixable: true,
          });
        }

        // Check unique constraint
        if (expectedIndex.unique !== actualIndex.unique) {
          issues.push({
            type: "missing_constraint",
            severity: "error",
            field: expectedIndex.fields.join(", "),
            description: `Index '${expectedIndex.name}' unique constraint mismatch: expected ${expectedIndex.unique}, got ${actualIndex.unique}`,
            auto_fixable: true,
          });
        }
      }
    }

    return { issues, warnings };
  }

  /**
   * Validate constraint definitions against database schema
   */
  private async validateConstraints(
    expectedConstraints: CollectionConstraintType[],
    actualConstraints: Array<{ name: string; type: string; fields: string[] }>
  ): Promise<{
    issues: CollectionTypeIssue[];
    warnings: string[];
  }> {
    const issues: CollectionTypeIssue[] = [];
    const warnings: string[] = [];

    for (const expectedConstraint of expectedConstraints) {
      const actualConstraint = actualConstraints.find(
        (c) => c.name === expectedConstraint.name
      );

      if (!actualConstraint) {
        issues.push({
          type: "missing_constraint",
          severity: "error",
          field: expectedConstraint.fields.join(", "),
          description: `Constraint '${expectedConstraint.name}' is missing from database`,
          auto_fixable: true,
        });
      } else {
        // Check constraint type
        if (actualConstraint.type !== expectedConstraint.type) {
          issues.push({
            type: "wrong_type",
            severity: "error",
            field: expectedConstraint.fields.join(", "),
            expected: expectedConstraint.type,
            actual: actualConstraint.type,
            description: `Constraint '${expectedConstraint.name}' has wrong type: expected ${expectedConstraint.type}, got ${actualConstraint.type}`,
            auto_fixable: true,
          });
        }

        // Check constraint fields
        const fieldsMatch = this.arraysEqual(
          expectedConstraint.fields,
          actualConstraint.fields
        );
        if (!fieldsMatch) {
          issues.push({
            type: "wrong_type",
            severity: "error",
            field: expectedConstraint.fields.join(", "),
            expected: expectedConstraint.fields.join(", "),
            actual: actualConstraint.fields.join(", "),
            description: `Constraint '${
              expectedConstraint.name
            }' has wrong fields: expected [${expectedConstraint.fields.join(
              ", "
            )}], got [${actualConstraint.fields.join(", ")}]`,
            auto_fixable: true,
          });
        }
      }
    }

    return { issues, warnings };
  }

  /**
   * Check for extra fields in database that are not in the type definition
   */
  private checkExtraFields(
    expectedFields: CollectionFieldType[],
    actualFields: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default?: string;
    }>
  ): CollectionTypeIssue[] {
    const issues: CollectionTypeIssue[] = [];
    const expectedFieldNames = expectedFields.map((f) => f.name);
    const systemFields = ["id", "created_at", "updated_at", "project_id"];

    for (const actualField of actualFields) {
      if (
        !expectedFieldNames.includes(actualField.name) &&
        !systemFields.includes(actualField.name)
      ) {
        issues.push({
          type: "extra_field",
          severity: "warning",
          field: actualField.name,
          actual: actualField.type,
          description: `Field '${actualField.name}' exists in database but not in type definition`,
          auto_fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Check for extra indexes in database that are not in the type definition
   */
  private checkExtraIndexes(
    expectedIndexes: CollectionIndexType[],
    actualIndexes: Array<{ name: string; fields: string[]; unique: boolean }>
  ): CollectionTypeIssue[] {
    const issues: CollectionTypeIssue[] = [];
    const expectedIndexNames = expectedIndexes.map((i) => i.name);
    const systemIndexes = ["_pkey"]; // Primary key index

    for (const actualIndex of actualIndexes) {
      if (
        !expectedIndexNames.includes(actualIndex.name) &&
        !systemIndexes.includes(actualIndex.name)
      ) {
        issues.push({
          type: "extra_field",
          severity: "warning",
          field: actualIndex.fields.join(", "),
          actual: actualIndex.name,
          description: `Index '${actualIndex.name}' exists in database but not in type definition`,
          auto_fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Check for potential performance issues
   */
  private checkPerformanceIssues(
    typeDefinition: CollectionTypeDefinition
  ): string[] {
    const warnings: string[] = [];

    // Check for missing indexes on frequently queried fields
    const stringFields = typeDefinition.fields.filter(
      (f) => f.type === "string"
    );
    const numberFields = typeDefinition.fields.filter(
      (f) => f.type === "number"
    );
    const dateFields = typeDefinition.fields.filter((f) => f.type === "date");

    for (const field of [...stringFields, ...numberFields, ...dateFields]) {
      if (
        field.indexed &&
        !typeDefinition.indexes.some((i) => i.fields.includes(field.name))
      ) {
        warnings.push(
          `Field '${field.name}' is marked as indexed but no index exists`
        );
      }
    }

    // Check for large text fields without proper indexing
    const textFields = typeDefinition.fields.filter((f) => f.type === "text");
    for (const field of textFields) {
      if (!typeDefinition.indexes.some((i) => i.fields.includes(field.name))) {
        warnings.push(
          `Large text field '${field.name}' should have an index for better query performance`
        );
      }
    }

    // Check for composite indexes
    if (typeDefinition.indexes.length > 0) {
      const compositeIndexes = typeDefinition.indexes.filter(
        (i) => i.fields.length > 1
      );
      if (compositeIndexes.length === 0) {
        warnings.push(
          "Consider adding composite indexes for fields that are frequently queried together"
        );
      }
    }

    return warnings;
  }

  /**
   * Auto-fix collection type issues
   */
  async autoFixCollectionType(
    typeDefinition: CollectionTypeDefinition,
    tableName: string
  ): Promise<CollectionTypeAutoFixResult> {
    const startTime = Date.now();
    const validation = await this.validateCollectionType(
      typeDefinition,
      tableName
    );

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
            const fix = await this.applyAutoFix(
              typeDefinition,
              tableName,
              issue
            );
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
    } catch (error) {
      this.logger.error(`Error auto-fixing collection type:`, error);
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
    typeDefinition: CollectionTypeDefinition,
    tableName: string,
    issue: CollectionTypeIssue
  ): Promise<CollectionTypeFix> {
    const startTime = Date.now();
    let sql = "";
    let description = "";

    try {
      switch (issue.type) {
        case "missing_field":
          if (issue.field) {
            const field = typeDefinition.fields.find(
              (f) => f.name === issue.field
            );
            if (field) {
              sql = `ALTER TABLE "${tableName}" ADD COLUMN "${field.name}" ${field.postgresql_type}`;
              if (!field.required) {
                sql += " NULL";
              }
              if (field.default !== undefined) {
                sql += ` DEFAULT ${this.formatDefaultValue(field.default)}`;
              }

              await this.dbConnection.query(sql);
              description = `Added missing field: ${issue.field}`;
            }
          }
          break;

        case "wrong_type":
          if (issue.field && issue.expected) {
            sql = `ALTER TABLE "${tableName}" ALTER COLUMN "${issue.field}" TYPE ${issue.expected}`;
            await this.dbConnection.query(sql);
            description = `Fixed field type: ${issue.field} -> ${issue.expected}`;
          }
          break;

        case "missing_index":
          if (issue.field) {
            const index = typeDefinition.indexes.find(
              (i) => i.fields.join(", ") === issue.field
            );
            if (index) {
              const unique = index.unique ? "UNIQUE " : "";
              const fields = index.fields.map((f) => `"${f}"`).join(", ");
              sql = `CREATE ${unique}INDEX "${index.name}" ON "${tableName}" (${fields})`;

              await this.dbConnection.query(sql);
              description = `Created missing index: ${index.name}`;
            }
          }
          break;

        case "missing_constraint":
          if (issue.field) {
            const constraint = typeDefinition.constraints.find(
              (c) => issue.field && c.fields.includes(issue.field)
            );
            if (constraint) {
              sql = this.buildConstraintSQL(tableName, constraint);
              await this.dbConnection.query(sql);
              description = `Added missing constraint: ${constraint.name}`;
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
   * Build SQL for adding a constraint
   */
  private buildConstraintSQL(
    tableName: string,
    constraint: CollectionConstraintType
  ): string {
    switch (constraint.type) {
      case "primary_key":
        return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${
          constraint.name
        }" PRIMARY KEY (${constraint.fields.map((f) => `"${f}"`).join(", ")})`;

      case "unique":
        return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${
          constraint.name
        }" UNIQUE (${constraint.fields.map((f) => `"${f}"`).join(", ")})`;

      case "not_null":
        return `ALTER TABLE "${tableName}" ALTER COLUMN "${constraint.fields[0]}" SET NOT NULL`;

      case "check":
        return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${constraint.name}" CHECK (${constraint.expression})`;

      case "foreign_key":
        if (constraint.reference) {
          const onDelete = constraint.reference.onDelete
            ? ` ON DELETE ${constraint.reference.onDelete}`
            : "";
          const onUpdate = constraint.reference.onUpdate
            ? ` ON UPDATE ${constraint.reference.onUpdate}`
            : "";
          return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${
            constraint.name
          }" FOREIGN KEY (${constraint.fields
            .map((f) => `"${f}"`)
            .join(", ")}) REFERENCES "${constraint.reference.table}"("${
            constraint.reference.field
          }")${onDelete}${onUpdate}`;
        }
        break;
    }

    return "";
  }

  /**
   * Format default value for SQL
   */
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

  /**
   * Check if two arrays are equal
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }
}
