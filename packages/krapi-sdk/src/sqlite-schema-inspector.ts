/**
 * SQLite Schema Inspector
 * 
 * Queries SQLite system tables to get actual database schema information
 * for comparison with expected collection schemas.
 * 
 * @class SQLiteSchemaInspector
 * @example
 * const inspector = new SQLiteSchemaInspector(dbConnection, console);
 * const schema = await inspector.getTableSchema('users');
 */
export class SQLiteSchemaInspector {
  constructor(
    private dbConnection: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[] }>;
    },
    private logger: Console = console
  ) {}

  /**
   * Get the complete schema for a table
   */
  async getTableSchema(tableName: string): Promise<{
    fields: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default?: string;
    }>;
    indexes: Array<{ name: string; fields: string[]; unique: boolean }>;
    constraints: Array<{ name: string; type: string; fields: string[] }>;
  }> {
    try {
      const [fields, indexes, constraints] = await Promise.all([
        this.getTableFields(tableName),
        this.getTableIndexes(tableName),
        this.getTableConstraints(tableName),
      ]);

      return { fields, indexes, constraints };
    } catch (error) {
      this.logger.error(`Error getting table schema for ${tableName}:`, error);
      throw new Error(
        `Failed to get table schema: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get all fields for a table using PRAGMA table_info
   */
  private async getTableFields(
    tableName: string
  ): Promise<
    Array<{ name: string; type: string; nullable: boolean; default?: string }>
  > {
    // SQLite uses PRAGMA table_info instead of information_schema
    // Quote table name to handle special characters
    const sql = `PRAGMA table_info("${tableName}")`;

    const result = await this.dbConnection.query(sql);
    const rows = (result.rows || []) as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number; // 0 = nullable, 1 = not null
      dflt_value: string | null;
      pk: number; // 0 = not primary key, 1 = primary key
    }>;

    return rows.map((row) => ({
      name: row.name,
      type: this.normalizeSQLiteType(row.type),
      nullable: row.notnull === 0,
      ...(row.dflt_value !== null && { default: row.dflt_value }),
    }));
  }

  /**
   * Get all indexes for a table using PRAGMA index_list and PRAGMA index_info
   */
  private async getTableIndexes(
    tableName: string
  ): Promise<Array<{ name: string; fields: string[]; unique: boolean }>> {
    // Get list of indexes
    const indexListResult = await this.dbConnection.query(
      `PRAGMA index_list("${tableName}")`
    );
    const indexList = (indexListResult.rows || []) as Array<{
      seq: number;
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }>;

    const indexes: Array<{ name: string; fields: string[]; unique: boolean }> =
      [];

    for (const indexInfo of indexList) {
      // Skip SQLite internal indexes (usually auto-created for primary keys)
      if (indexInfo.name.startsWith("sqlite_")) {
        continue;
      }

      // Get columns for this index
      const indexColumnsResult = await this.dbConnection.query(
        `PRAGMA index_info(${indexInfo.name})`
      );
      const indexColumns = (indexColumnsResult.rows || []) as Array<{
        seqno: number;
        cid: number;
        name: string;
      }>;

      indexes.push({
        name: indexInfo.name,
        fields: indexColumns.map((col) => col.name),
        unique: indexInfo.unique === 1,
      });
    }

    return indexes;
  }

  /**
   * Get all constraints for a table using PRAGMA foreign_key_list
   */
  private async getTableConstraints(
    tableName: string
  ): Promise<Array<{ name: string; type: string; fields: string[] }>> {
    const constraints: Array<{ name: string; type: string; fields: string[] }> =
      [];

    // Get foreign key constraints
    const fkResult = await this.dbConnection.query(
      `PRAGMA foreign_key_list("${tableName}")`
    );
    const fkList = (fkResult.rows || []) as Array<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      on_update: string;
      on_delete: string;
      match: string;
    }>;

    for (const fk of fkList) {
      constraints.push({
        name: `fk_${tableName}_${fk.from}`,
        type: "FOREIGN KEY",
        fields: [fk.from],
      });
    }

    // SQLite doesn't have a simple way to get CHECK constraints
    // They would need to be parsed from CREATE TABLE statement
    // For now, we'll skip them

    return constraints;
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const sql = `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `;

    const result = await this.dbConnection.query(sql, [tableName]);
    return (result.rows || []).length > 0;
  }

  /**
   * Get all table names in the database
   */
  async getAllTableNames(): Promise<string[]> {
    const sql = `
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    const result = await this.dbConnection.query(sql);
    const typedRows = (result.rows || []) as Array<{ name: string }>;
    return typedRows.map((row) => row.name);
  }

  /**
   * Get table size and row count
   */
  async getTableStats(tableName: string): Promise<{
    rowCount: number;
    sizeBytes: number;
    indexSizeBytes: number;
  }> {
    try {
      // Get row count
      const countResult = await this.dbConnection.query(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );
      const rowCount = parseInt(
        String((countResult.rows || [])[0]?.["count"] || 0)
      );

      // SQLite doesn't have pg_size functions
      // We can estimate size based on row count, but it's not accurate
      // For now, return 0 for size
      return {
        rowCount,
        sizeBytes: 0,
        indexSizeBytes: 0,
      };
    } catch (error) {
      this.logger.error(`Error getting table stats for ${tableName}:`, error);
      return {
        rowCount: 0,
        sizeBytes: 0,
        indexSizeBytes: 0,
      };
    }
  }

  /**
   * Check table integrity (for compatibility with PostgreSQL schema inspector)
   */
  async checkTableIntegrity(tableName: string): Promise<{
    hasNullViolations: boolean;
    hasUniqueViolations: boolean;
    hasForeignKeyViolations: boolean;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];
      let hasNullViolations = false;
      let hasUniqueViolations = false;
      const hasForeignKeyViolations = false;

      // Check if table exists
      const exists = await this.tableExists(tableName);
      if (!exists) {
        return {
          hasNullViolations: false,
          hasUniqueViolations: false,
          hasForeignKeyViolations: false,
          issues: [`Table ${tableName} does not exist`],
        };
      }

      // Get table schema
      const schema = await this.getTableSchema(tableName);
      
      // Check for NULL violations in NOT NULL columns
      const notNullFields = schema.fields.filter((f) => !f.nullable);
      for (const field of notNullFields) {
        const checkSql = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${field.name} IS NULL`;
        const result = await this.dbConnection.query(checkSql);
        const count = parseInt(String((result.rows || [])[0]?.["count"] || 0));
        if (count > 0) {
          hasNullViolations = true;
          issues.push(`Column ${field.name} has ${count} NULL values but is marked as NOT NULL`);
        }
      }

      // Check for unique constraint violations
      const uniqueIndexes = schema.indexes.filter((idx) => idx.unique);
      for (const index of uniqueIndexes) {
        if (index.fields.length > 0) {
          const fieldList = index.fields.map((f) => `"${f}"`).join(", ");
          const checkSql = `
            SELECT COUNT(*) as count FROM (
              SELECT ${fieldList} FROM ${tableName} 
              WHERE ${index.fields.map((f) => `${f} IS NOT NULL`).join(" AND ")}
              GROUP BY ${fieldList} 
              HAVING COUNT(*) > 1
            ) duplicates
          `;
          const result = await this.dbConnection.query(checkSql);
          const count = parseInt(String((result.rows || [])[0]?.["count"] || 0));
          if (count > 0) {
            hasUniqueViolations = true;
            issues.push(`Index ${index.name} has ${count} duplicate values`);
          }
        }
      }

      // Check for foreign key violations
      const fkConstraints = schema.constraints.filter((c) => c.type === "FOREIGN KEY");
      for (const _constraint of fkConstraints) {
        // SQLite foreign key checking is handled by PRAGMA foreign_key_check
        // For now, we'll skip detailed checking
        // SQLite will enforce foreign keys if they're enabled
      }

      return {
        hasNullViolations,
        hasUniqueViolations,
        hasForeignKeyViolations,
        issues,
      };
    } catch (error) {
      return {
        hasNullViolations: false,
        hasUniqueViolations: false,
        hasForeignKeyViolations: false,
        issues: [
          `Error checking table integrity: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
      };
    }
  }

  /**
   * Normalize SQLite types to standard types
   */
  private normalizeSQLiteType(type: string): string {
    const upperType = type.toUpperCase();

    // SQLite is flexible with types, normalize common patterns
    if (upperType.includes("INT")) {
      return "INTEGER";
    }
    if (upperType.includes("CHAR") || upperType.includes("VARCHAR") || upperType === "TEXT") {
      return "TEXT";
    }
    if (upperType.includes("REAL") || upperType.includes("FLOAT") || upperType.includes("DOUBLE")) {
      return "REAL";
    }
    if (upperType === "BLOB") {
      return "BLOB";
    }

    return type;
  }
}

