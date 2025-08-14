/**
 * PostgreSQL Schema Inspector
 *
 * Queries PostgreSQL system tables to get actual database schema information
 * for comparison with expected collection schemas.
 */
export class PostgreSQLSchemaInspector {
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
   * Get all fields for a table
   */
  private async getTableFields(
    tableName: string
  ): Promise<
    Array<{ name: string; type: string; nullable: boolean; default?: string }>
  > {
    const sql = `
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable = 'YES' as nullable,
        column_default as default_value
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `;

    const result = await this.dbConnection.query(sql, [tableName]);
    const rows = (result.rows || []) as Array<{
      name: string;
      type: string;
      nullable: boolean;
      default_value?: string;
    }>;

    return rows.map((row) => ({
      name: row.name,
      type: this.normalizePostgreSQLType(row.type),
      nullable: row.nullable,
      ...(row.default_value !== undefined && { default: row.default_value }),
    }));
  }

  /**
   * Get all indexes for a table
   */
  private async getTableIndexes(
    tableName: string
  ): Promise<Array<{ name: string; fields: string[]; unique: boolean }>> {
    const sql = `
      SELECT 
        i.relname as name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as fields,
        ix.indisunique as unique
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1 AND i.relname NOT LIKE '%_pkey'
      GROUP BY i.relname, ix.indisunique
      ORDER BY i.relname
    `;

    const result = await this.dbConnection.query(sql, [tableName]);
    const rows = (result.rows || []) as Array<{
      name: string;
      fields: string[];
      unique: boolean;
    }>;

    return rows.map((row) => ({
      name: row.name,
      fields: row.fields || [],
      unique: row.unique,
    }));
  }

  /**
   * Get all constraints for a table
   */
  private async getTableConstraints(
    tableName: string
  ): Promise<Array<{ name: string; type: string; fields: string[] }>> {
    const sql = `
      SELECT 
        tc.constraint_name as name,
        tc.constraint_type as type,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as fields
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1
      GROUP BY tc.constraint_name, tc.constraint_type
      ORDER BY tc.constraint_name
    `;

    const result = await this.dbConnection.query(sql, [tableName]);
    const rows = (result.rows || []) as Array<{
      name: string;
      type: string;
      fields: string[];
    }>;

    return rows.map((row) => ({
      name: row.name,
      type: row.type,
      fields: row.fields || [],
    }));
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const sql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )
    `;

    const result = await this.dbConnection.query(sql, [tableName]);
    const row = (result.rows || [])[0] as { exists: boolean } | undefined;
    return row?.exists || false;
  }

  /**
   * Get all table names in the database
   */
  async getAllTableNames(): Promise<string[]> {
    const sql = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const result = await this.dbConnection.query(sql);
    const typedRows = (result.rows || []) as Array<{ table_name: string }>;
    return typedRows.map((row) => row.table_name);
  }

  /**
   * Get table size and row count
   */
  async getTableStats(tableName: string): Promise<{
    rowCount: number;
    sizeBytes: number;
    indexSizeBytes: number;
  }> {
    const sql = `
      SELECT 
        (SELECT reltuples FROM pg_class WHERE relname = $1) as row_count,
        pg_total_relation_size($1::regclass) as total_size,
        pg_indexes_size($1::regclass) as index_size
    `;

    const result = await this.dbConnection.query(sql, [tableName]);
    const row = (result.rows || [])[0] as
      | { row_count: number; total_size: string; index_size: string }
      | undefined;

    return {
      rowCount: Math.floor(row?.row_count || 0),
      sizeBytes: parseInt((row?.total_size as string) || "0"),
      indexSizeBytes: parseInt((row?.index_size as string) || "0"),
    };
  }

  /**
   * Check for orphaned tables (tables that don't have corresponding collection definitions)
   */
  async findOrphanedTables(collectionNames: string[]): Promise<string[]> {
    const allTables = await this.getAllTableNames();
    const systemTables = [
      "migrations",
      "schema_versions",
      "admin_users",
      "projects",
      "api_keys",
      "sessions",
      "changelog",
      "activity_log",
    ];

    return allTables.filter(
      (table) =>
        !collectionNames.includes(table) &&
        !systemTables.includes(table) &&
        !table.startsWith("pg_") &&
        !table.startsWith("sql_")
    );
  }

  /**
   * Get foreign key relationships for a table
   */
  async getTableForeignKeys(tableName: string): Promise<
    Array<{
      constraintName: string;
      columnName: string;
      referencedTable: string;
      referencedColumn: string;
      onDelete: string;
      onUpdate: string;
    }>
  > {
    const sql = `
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.delete_rule as on_delete,
        rc.update_rule as on_update
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = $1
      ORDER BY kcu.ordinal_position
    `;

    const result = await this.dbConnection.query(sql, [tableName]);
    const typedRows = (result.rows || []) as Array<{
      constraint_name: string;
      column_name: string;
      referenced_table: string;
      referenced_column: string;
      on_delete: string;
      on_update: string;
    }>;

    return typedRows.map((row) => ({
      constraintName: row.constraint_name,
      columnName: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
      onDelete: row.on_delete,
      onUpdate: row.on_update,
    }));
  }

  /**
   * Check for data integrity issues in a table
   */
  async checkTableIntegrity(tableName: string): Promise<{
    hasNullViolations: boolean;
    hasUniqueViolations: boolean;
    hasForeignKeyViolations: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let hasNullViolations = false;
    let hasUniqueViolations = false;
    let hasForeignKeyViolations = false;

    try {
      // Check for NULL violations in NOT NULL columns
      const nullCheckSql = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
          AND is_nullable = 'NO' 
          AND column_default IS NULL
      `;

      const nullResult = await this.dbConnection.query(nullCheckSql, [
        tableName,
      ]);
      const typedRows = (nullResult.rows || []) as Array<{
        column_name: string;
      }>;
      const notNullColumns = typedRows.map((row) => row.column_name);

      for (const column of notNullColumns) {
        const violationCheck = `
          SELECT COUNT(*) as count 
          FROM "${tableName}" 
          WHERE "${column}" IS NULL
        `;

        const violationResult = await this.dbConnection.query(violationCheck);
        const typedRow = (violationResult.rows || [])[0] as
          | { count: string }
          | undefined;
        const count = parseInt(typedRow?.count || "0");

        if (count > 0) {
          hasNullViolations = true;
          issues.push(
            `Column ${column} has ${count} NULL values but is marked as NOT NULL`
          );
        }
      }

      // Check for unique constraint violations
      const uniqueColumns = await this.getUniqueColumns(tableName);
      for (const column of uniqueColumns) {
        const duplicateCheck = `
          SELECT COUNT(*) as count 
          FROM (
            SELECT "${column}" 
            FROM "${tableName}" 
            WHERE "${column}" IS NOT NULL 
            GROUP BY "${column}" 
            HAVING COUNT(*) > 1
          ) duplicates
        `;

        const duplicateResult = await this.dbConnection.query(duplicateCheck);
        const typedRow = (duplicateResult.rows || [])[0] as
          | { count: string }
          | undefined;
        const count = parseInt(typedRow?.count || "0");

        if (count > 0) {
          hasUniqueViolations = true;
          issues.push(
            `Column ${column} has ${count} duplicate values but is marked as UNIQUE`
          );
        }
      }

      // Check for foreign key violations
      const foreignKeys = await this.getTableForeignKeys(tableName);
      for (const fk of foreignKeys) {
        const fkViolationCheck = `
          SELECT COUNT(*) as count 
          FROM "${tableName}" t
          LEFT JOIN "${fk.referencedTable}" r 
            ON t."${fk.columnName}" = r."${fk.referencedColumn}"
          WHERE t."${fk.columnName}" IS NOT NULL 
            AND r."${fk.referencedColumn}" IS NULL
        `;

        const fkViolationResult = await this.dbConnection.query(
          fkViolationCheck
        );
        const typedRow = (fkViolationResult.rows || [])[0] as
          | { count: string }
          | undefined;
        const count = parseInt(typedRow?.count || "0");

        if (count > 0) {
          hasForeignKeyViolations = true;
          issues.push(
            `Foreign key ${fk.constraintName} has ${count} violations`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking table integrity for ${tableName}:`,
        error
      );
      issues.push(
        `Failed to check integrity: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return {
      hasNullViolations,
      hasUniqueViolations,
      hasForeignKeyViolations,
      issues,
    };
  }

  /**
   * Get columns that should be unique based on constraints
   */
  private async getUniqueColumns(tableName: string): Promise<string[]> {
    const sql = `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1 
        AND tc.constraint_type = 'UNIQUE'
      ORDER BY kcu.ordinal_position
    `;

    const result = await this.dbConnection.query(sql, [tableName]);
    const typedRows = (result.rows || []) as Array<{ column_name: string }>;
    return typedRows.map((row) => row.column_name);
  }

  /**
   * Normalize PostgreSQL data types to standard types
   */
  private normalizePostgreSQLType(pgType: string): string {
    const typeMap: Record<string, string> = {
      // Character types
      "character varying": "VARCHAR",
      character: "CHAR",
      text: "TEXT",

      // Numeric types
      integer: "INTEGER",
      bigint: "BIGINT",
      smallint: "SMALLINT",
      numeric: "NUMERIC",
      decimal: "DECIMAL",
      real: "REAL",
      "double precision": "DOUBLE PRECISION",

      // Boolean types
      boolean: "BOOLEAN",

      // Date/time types
      "timestamp without time zone": "TIMESTAMP",
      "timestamp with time zone": "TIMESTAMPTZ",
      date: "DATE",
      "time without time zone": "TIME",
      "time with time zone": "TIMETZ",

      // Binary types
      bytea: "BYTEA",

      // JSON types
      json: "JSON",
      jsonb: "JSONB",

      // UUID
      uuid: "UUID",

      // Arrays
      ARRAY: "ARRAY",
    };

    return typeMap[pgType.toLowerCase()] || pgType.toUpperCase();
  }
}
