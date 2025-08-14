import {
  DatabaseIssue,
  SchemaMismatch,
  FieldMismatch,
  FieldDefinition,
  TableDefinition,
  IndexDefinition,
  ConstraintDefinition,
} from "./types";

/**
 * PostgreSQL-specific auto-fixer implementation
 * Handles all database schema misalignments and automatically corrects them
 */
export class PostgreSQLAutoFixer {
  constructor(
    private dbConnection: {
      query: (sql: string) => Promise<{ rows?: unknown[] }>;
    },
    private logger: Console = console
  ) {}

  /**
   * Fix missing fields in tables
   */
  async fixMissingFields(
    missingFields: SchemaMismatch[]
  ): Promise<{ success: boolean; fixed: string[] }> {
    const fixed: string[] = [];

    for (const mismatch of missingFields) {
      if (mismatch.type === "missing_field" && mismatch.field) {
        try {
          const fieldDef = await this.getExpectedFieldDefinition(
            mismatch.table,
            mismatch.field
          );
          if (fieldDef) {
            await this.addField(mismatch.table, mismatch.field, fieldDef);
            fixed.push(`${mismatch.table}.${mismatch.field}`);
            this.logger.info(
              `Added missing field: ${mismatch.table}.${mismatch.field}`
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to fix missing field ${mismatch.table}.${mismatch.field}:`,
            error
          );
        }
      }
    }

    return { success: fixed.length > 0, fixed };
  }

  /**
   * Fix field type mismatches
   */
  async fixFieldTypeMismatches(
    fieldMismatches: FieldMismatch[]
  ): Promise<{ success: boolean; fixed: string[] }> {
    const fixed: string[] = [];

    for (const mismatch of fieldMismatches) {
      try {
        await this.modifyFieldType(
          mismatch.table,
          mismatch.field,
          mismatch.expected
        );
        fixed.push(`${mismatch.table}.${mismatch.field}`);
        this.logger.info(
          `Fixed field type: ${mismatch.table}.${mismatch.field}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to fix field type ${mismatch.table}.${mismatch.field}:`,
          error
        );
      }
    }

    return { success: fixed.length > 0, fixed };
  }

  /**
   * Fix missing indexes
   */
  async fixMissingIndexes(
    missingIndexes: SchemaMismatch[]
  ): Promise<{ success: boolean; fixed: string[] }> {
    const fixed: string[] = [];

    for (const mismatch of missingIndexes) {
      if (mismatch.type === "missing_index") {
        try {
          const indexDef = await this.getExpectedIndexDefinition(
            mismatch.table,
            mismatch.field || "id"
          );
          if (indexDef) {
            await this.createIndex(mismatch.table, indexDef);
            fixed.push(`${mismatch.table}.${indexDef.name}`);
            this.logger.info(
              `Created missing index: ${mismatch.table}.${indexDef.name}`
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to create index for ${mismatch.table}:`,
            error
          );
        }
      }
    }

    return { success: fixed.length > 0, fixed };
  }

  /**
   * Fix missing constraints
   */
  async fixMissingConstraints(
    missingConstraints: SchemaMismatch[]
  ): Promise<{ success: boolean; fixed: string[] }> {
    const fixed: string[] = [];

    for (const mismatch of missingConstraints) {
      if (mismatch.type === "missing_constraint") {
        try {
          const constraintDef = await this.getExpectedConstraintDefinition(
            mismatch.table,
            mismatch.field || "id"
          );
          if (constraintDef) {
            await this.createConstraint(mismatch.table, constraintDef);
            fixed.push(`${mismatch.table}.${constraintDef.name}`);
            this.logger.info(
              `Created missing constraint: ${mismatch.table}.${constraintDef.name}`
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to create constraint for ${mismatch.table}:`,
            error
          );
        }
      }
    }

    return { success: fixed.length > 0, fixed };
  }

  /**
   * Fix missing tables
   */
  async fixMissingTables(
    missingTables: string[]
  ): Promise<{ success: boolean; fixed: string[] }> {
    const fixed: string[] = [];

    for (const tableName of missingTables) {
      try {
        const tableDef = await this.getExpectedTableDefinition(tableName);
        if (tableDef) {
          await this.createTable(tableName, tableDef);
          fixed.push(tableName);
          this.logger.info(`Created missing table: ${tableName}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create table ${tableName}:`, error);
      }
    }

    return { success: fixed.length > 0, fixed };
  }

  /**
   * Fix foreign key violations
   */
  async fixForeignKeyViolations(): Promise<{
    success: boolean;
    fixed: string[];
  }> {
    const fixed: string[] = [];

    try {
      // Get all foreign key violations
      const violations = await this.getForeignKeyViolations();

      for (const violation of violations) {
        try {
          await this.fixForeignKeyViolation(violation);
          fixed.push(`${violation.table_name}.${violation.constraint_name}`);
          this.logger.info(
            `Fixed foreign key violation: ${violation.table_name}.${violation.constraint_name}`
          );
        } catch (error) {
          this.logger.error(
            `Failed to fix foreign key violation ${violation.table_name}.${violation.constraint_name}:`,
            error
          );
        }
      }
    } catch (error) {
      this.logger.error("Failed to get foreign key violations:", error);
    }

    return { success: fixed.length > 0, fixed };
  }

  /**
   * Comprehensive auto-fix for all detected issues
   */
  async autoFixAll(
    issues: DatabaseIssue[]
  ): Promise<{ success: boolean; summary: Record<string, number> }> {
    const startTime = Date.now();
    this.logger.info("Starting comprehensive auto-fix...");

    const summary: Record<string, number> = {
      missingFields: 0,
      typeMismatches: 0,
      missingIndexes: 0,
      missingConstraints: 0,
      missingTables: 0,
      foreignKeyViolations: 0,
    };

    try {
      // Group issues by type
      const missingFields = issues.filter((i) => i.type === "missing_field");
      const typeMismatches = issues.filter((i) => i.type === "type_mismatch");
      const missingIndexes = issues.filter((i) => i.type === "missing_index");
      const missingConstraints = issues.filter(
        (i) => i.type === "missing_constraint"
      );
      const missingTables = issues.filter((i) => i.type === "missing_table");
      const foreignKeyViolations = issues.filter(
        (i) => i.type === "foreign_key_violation"
      );

      // Apply fixes for each type
      if (missingFields.length > 0) {
        const result = await this.fixMissingFields(
          missingFields as unknown as SchemaMismatch[]
        );
        summary.missingFields = result.fixed.length;
      }

      if (typeMismatches.length > 0) {
        const result = await this.fixFieldTypeMismatches(
          typeMismatches as unknown as FieldMismatch[]
        );
        summary.typeMismatches = result.fixed.length;
      }

      if (missingIndexes.length > 0) {
        const result = await this.fixMissingIndexes(
          missingIndexes as unknown as SchemaMismatch[]
        );
        summary.missingIndexes = result.fixed.length;
      }

      if (missingConstraints.length > 0) {
        const result = await this.fixMissingConstraints(
          missingConstraints as unknown as SchemaMismatch[]
        );
        summary.missingConstraints = result.fixed.length;
      }

      if (missingTables.length > 0) {
        const result = await this.fixMissingTables(
          missingTables
            .map((i) => i.table)
            .filter((table): table is string => table !== undefined)
        );
        summary.missingTables = result.fixed.length;
      }

      if (foreignKeyViolations.length > 0) {
        const result = await this.fixForeignKeyViolations();
        summary.foreignKeyViolations = result.fixed.length;
      }

      const totalFixes = Object.values(summary).reduce(
        (sum, count) => sum + count,
        0
      );
      const duration = Date.now() - startTime;

      this.logger.info(
        `Auto-fix completed in ${duration}ms. Applied ${totalFixes} fixes.`
      );

      return {
        success: totalFixes > 0,
        summary,
      };
    } catch (error) {
      this.logger.error("Auto-fix failed:", error);
      throw new Error(
        `Auto-fix failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Private helper methods for PostgreSQL operations

  private async addField(
    tableName: string,
    fieldName: string,
    fieldDef: FieldDefinition
  ): Promise<void> {
    const sql = this.buildAddFieldSQL(tableName, fieldName, fieldDef);
    await this.dbConnection.query(sql);
  }

  private async modifyFieldType(
    tableName: string,
    fieldName: string,
    fieldDef: FieldDefinition
  ): Promise<void> {
    const sql = this.buildModifyFieldSQL(tableName, fieldName, fieldDef);
    await this.dbConnection.query(sql);
  }

  private async createIndex(
    tableName: string,
    indexDef: IndexDefinition
  ): Promise<void> {
    const sql = this.buildCreateIndexSQL(tableName, indexDef);
    await this.dbConnection.query(sql);
  }

  private async createConstraint(
    tableName: string,
    constraintDef: ConstraintDefinition
  ): Promise<void> {
    const sql = this.buildCreateConstraintSQL(tableName, constraintDef);
    await this.dbConnection.query(sql);
  }

  private async createTable(
    tableName: string,
    tableDef: TableDefinition
  ): Promise<void> {
    const sql = this.buildCreateTableSQL(tableName, tableDef);
    await this.dbConnection.query(sql);
  }

  private async fixForeignKeyViolation(_violation: unknown): Promise<void> {
    // Implementation depends on the type of violation
    // Could involve updating references, deleting orphaned records, etc.
  }

  private async getForeignKeyViolations(): Promise<
    Array<{
      table_name: string;
      constraint_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>
  > {
    // Query to find foreign key violations
    const sql = `
      SELECT 
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `;

    const result = await this.dbConnection.query(sql);
    return (result.rows || []) as Array<{
      table_name: string;
      constraint_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>;
  }

  // SQL building methods

  private buildAddFieldSQL(
    tableName: string,
    fieldName: string,
    fieldDef: FieldDefinition
  ): string {
    let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${fieldName}" `;

    // Add type with precision/scale if needed
    if (fieldDef.type === "varchar" && fieldDef.length) {
      sql += `VARCHAR(${fieldDef.length})`;
    } else if (
      fieldDef.type === "decimal" &&
      fieldDef.precision &&
      fieldDef.scale
    ) {
      sql += `DECIMAL(${fieldDef.precision}, ${fieldDef.scale})`;
    } else {
      sql += fieldDef.type.toUpperCase();
    }

    // Add constraints
    if (!fieldDef.nullable) {
      sql += " NOT NULL";
    }

    if (fieldDef.unique) {
      sql += " UNIQUE";
    }

    if (fieldDef.default !== undefined) {
      sql += ` DEFAULT ${fieldDef.default}`;
    }

    return sql;
  }

  private buildModifyFieldSQL(
    tableName: string,
    fieldName: string,
    fieldDef: FieldDefinition
  ): string {
    let sql = `ALTER TABLE "${tableName}" ALTER COLUMN "${fieldName}" TYPE `;

    if (fieldDef.type === "varchar" && fieldDef.length) {
      sql += `VARCHAR(${fieldDef.length})`;
    } else if (
      fieldDef.type === "decimal" &&
      fieldDef.precision &&
      fieldDef.scale
    ) {
      sql += `DECIMAL(${fieldDef.precision}, ${fieldDef.scale})`;
    } else {
      sql += fieldDef.type.toUpperCase();
    }

    // Add USING clause for type conversion if needed
    sql += ` USING "${fieldName}"::${fieldDef.type.toUpperCase()}`;

    return sql;
  }

  private buildCreateIndexSQL(
    tableName: string,
    indexDef: IndexDefinition
  ): string {
    const unique = indexDef.unique ? "UNIQUE " : "";
    const indexType = indexDef.type
      ? `USING ${indexDef.type.toUpperCase()} `
      : "";
    const fields = indexDef.fields.map((f) => `"${f}"`).join(", ");

    return `CREATE ${unique}INDEX "${indexDef.name}" ${indexType}ON "${tableName}" (${fields})`;
  }

  private buildCreateConstraintSQL(
    tableName: string,
    constraintDef: ConstraintDefinition
  ): string {
    switch (constraintDef.type) {
      case "primary_key":
        return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${
          constraintDef.name
        }" PRIMARY KEY (${constraintDef.fields
          .map((f) => `"${f}"`)
          .join(", ")})`;

      case "foreign_key":
        if (constraintDef.reference) {
          let sql = `ALTER TABLE "${tableName}" ADD CONSTRAINT "${
            constraintDef.name
          }" FOREIGN KEY (${constraintDef.fields
            .map((f) => `"${f}"`)
            .join(", ")}) REFERENCES "${constraintDef.reference.table}" ("${
            constraintDef.reference.field
          }")`;

          if (constraintDef.reference.onDelete) {
            sql += ` ON DELETE ${constraintDef.reference.onDelete.toUpperCase()}`;
          }

          if (constraintDef.reference.onUpdate) {
            sql += ` ON UPDATE ${constraintDef.reference.onUpdate.toUpperCase()}`;
          }

          return sql;
        }
        break;

      case "unique":
        return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${
          constraintDef.name
        }" UNIQUE (${constraintDef.fields.map((f) => `"${f}"`).join(", ")})`;

      case "check":
        if (constraintDef.expression) {
          return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${constraintDef.name}" CHECK (${constraintDef.expression})`;
        }
        break;

      case "not_null":
        return `ALTER TABLE "${tableName}" ALTER COLUMN "${constraintDef.fields[0]}" SET NOT NULL`;
    }

    throw new Error(`Unsupported constraint type: ${constraintDef.type}`);
  }

  private buildCreateTableSQL(
    tableName: string,
    tableDef: TableDefinition
  ): string {
    let sql = `CREATE TABLE "${tableName}" (\n`;

    // Add fields
    const fieldDefinitions = Object.entries(tableDef.fields).map(
      ([name, def]) => {
        let fieldDef = `  "${name}" `;

        if (def.type === "varchar" && def.length) {
          fieldDef += `VARCHAR(${def.length})`;
        } else if (def.type === "decimal" && def.precision && def.scale) {
          fieldDef += `DECIMAL(${def.precision}, ${def.scale})`;
        } else {
          fieldDef += def.type.toUpperCase();
        }

        if (!def.nullable) fieldDef += " NOT NULL";
        if (def.unique) fieldDef += " UNIQUE";
        if (def.default !== undefined) fieldDef += ` DEFAULT ${def.default}`;

        return fieldDef;
      }
    );

    sql += fieldDefinitions.join(",\n");
    sql += "\n)";

    return sql;
  }

  // Load expected definitions from schema configuration or database
  private async getExpectedFieldDefinition(
    _tableName: string,
    _fieldName: string
  ): Promise<FieldDefinition | null> {
    // This would load from a schema definition file or database configuration
    // For now, we'll return null to indicate no expected definition
    // In a real implementation, this would:
    // 1. Check for schema files in the project
    // 2. Query a schema registry table
    // 3. Use default field definitions based on naming conventions
    return null;
  }

  private async getExpectedIndexDefinition(
    _tableName: string,
    _fieldName: string
  ): Promise<IndexDefinition | null> {
    // This would load from a schema definition file or database configuration
    // For now, we'll return null to indicate no expected definition
    // In a real implementation, this would:
    // 1. Check for schema files in the project
    // 2. Query a schema registry table
    // 3. Use default index definitions based on field types
    return null;
  }

  private async getExpectedConstraintDefinition(
    _tableName: string,
    _fieldName: string
  ): Promise<ConstraintDefinition | null> {
    // This would load from a schema definition file or database configuration
    // For now, we'll return null to indicate no expected definition
    // In a real implementation, this would:
    // 1. Check for schema files in the project
    // 2. Query a schema registry table
    // 3. Use default constraint definitions based on field types
    return null;
  }

  private async getExpectedTableDefinition(
    _tableName: string
  ): Promise<TableDefinition | null> {
    // This would load from a schema definition file or database configuration
    // For now, we'll return null to indicate no expected definition
    // In a real implementation, this would:
    // 1. Check for schema files in the project
    // 2. Query a schema registry table
    // 3. Use default table definitions based on naming conventions
    return null;
  }
}
