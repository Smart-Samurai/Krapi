import { FieldType } from "./core";
import {
  ExpectedSchema,
  TableDefinition,
  FieldDefinition,
  IndexDefinition,
  ConstraintDefinition,
  RelationDefinition,
} from "./types";

/**
 * Schema Generator
 * 
 * Automatically generates PostgreSQL schema definitions from TypeScript interfaces.
 * This ensures the database schema always matches the current code structure.
 * 
 * @class SchemaGenerator
 * @example
 * const generator = new SchemaGenerator(interfaces, {
 *   defaultStringLength: 255,
 *   generateIndexes: true
 * });
 * const schema = generator.generateSchema();
 */
export class SchemaGenerator {
  private typeMapping: Record<string, string> = {
    string: "VARCHAR(255)",
    number: "INTEGER",
    boolean: "BOOLEAN",
    Date: "TIMESTAMP",
    "string | undefined": "VARCHAR(255)",
    "number | undefined": "INTEGER",
    "boolean | undefined": "BOOLEAN",
    "Date | undefined": "TIMESTAMP",
    "Record<string, unknown>": "JSONB",
    "Record<string, any>": "JSONB",
    "unknown[]": "JSONB",
    "any[]": "JSONB",
  };

  constructor(
    private interfaces: Record<string, unknown> = {},
    private options: SchemaGeneratorOptions = {}
  ) {
    this.options = {
      defaultStringLength: 255,
      defaultDecimalPrecision: 10,
      defaultDecimalScale: 2,
      generateIndexes: true,
      generateConstraints: true,
      ...options,
    };
  }

  /**
   * Generate complete database schema from TypeScript interfaces
   */
  generateSchema(): ExpectedSchema {
    const tables: TableDefinition[] = [];

    // Process each interface to generate table definitions
    for (const [interfaceName, interfaceDef] of Object.entries(
      this.interfaces
    )) {
      if (this.shouldGenerateTable(interfaceName, interfaceDef)) {
        const tableName = this.getTableName(interfaceName);
        const tableDef = this.generateTableDefinition(
          interfaceName,
          interfaceDef
        );
        tables.push({
          name: tableName,
          ...tableDef,
        });
      }
    }

    // Generate relations between tables
    this.generateRelations(tables);

    return {
      tables,
      version: this.getSchemaVersion(),
    };
  }

  /**
   * Generate table definition from a TypeScript interface
   */
  private generateTableDefinition(
    interfaceName: string,
    interfaceDef: unknown
  ): Omit<TableDefinition, "name"> {
    const fields: FieldDefinition[] = [];
    const indexes: IndexDefinition[] = [];
    const constraints: ConstraintDefinition[] = [];

    // Process interface properties
    for (const [propertyName, propertyDef] of Object.entries(
      interfaceDef as Record<string, unknown>
    )) {
      if (this.shouldGenerateField(propertyName, propertyDef)) {
        const fieldName = this.getFieldName(propertyName);
        const fieldDef = this.generateFieldDefinition(
          propertyName,
          propertyDef
        );
        fieldDef.name = fieldName;
        fields.push(fieldDef);

        // Generate indexes for certain field types
        if (this.options.generateIndexes) {
          const fieldIndexes = this.generateFieldIndexes(
            interfaceName,
            fieldName,
            propertyDef
          );
          indexes.push(...fieldIndexes);
        }
      }
    }

    // Generate constraints
    if (this.options.generateConstraints) {
      const tableConstraints = this.generateTableConstraints(
        interfaceName,
        fields
      );
      constraints.push(...tableConstraints);
    }

    return {
      fields,
      indexes,
      constraints,
      relations: [],
    };
  }

  /**
   * Generate field definition from a TypeScript property
   */
  private generateFieldDefinition(
    propertyName: string,
    propertyDef: unknown
  ): FieldDefinition {
    const type = this.mapTypeScriptType(
      (propertyDef as { type?: unknown }).type || propertyDef
    );
    const isOptional = this.isOptionalProperty(propertyDef);
    const isPrimary = this.isPrimaryKey(propertyName);
    const isUnique = this.isUniqueField(propertyName, propertyDef);

    let fieldType = type;
    let length: number | undefined;
    let precision: number | undefined;
    let scale: number | undefined;
    let defaultValue: string | undefined;

    // Handle specific field types
    if (type === "VARCHAR" && this.options.defaultStringLength) {
      length = this.options.defaultStringLength;
      fieldType = `VARCHAR(${length})`;
    } else if (type === "DECIMAL") {
      precision = this.options.defaultDecimalPrecision;
      scale = this.options.defaultDecimalScale;
      fieldType = `DECIMAL(${precision}, ${scale})`;
    } else if (type === "TIMESTAMP" && propertyName === "created_at") {
      defaultValue = "CURRENT_TIMESTAMP";
    } else if (type === "TIMESTAMP" && propertyName === "updated_at") {
      defaultValue = "CURRENT_TIMESTAMP";
    }

    const fieldDef: FieldDefinition = {
      name: propertyName,
      type: this.mapFieldType(fieldType),
      required: !isOptional,
      nullable: isOptional,
      primary: isPrimary,
      unique: isUnique,
    };

    if (defaultValue !== undefined) {
      fieldDef.default = defaultValue;
    }
    if (length !== undefined) {
      fieldDef.length = length;
    }
    if (precision !== undefined) {
      fieldDef.precision = precision;
    }
    if (scale !== undefined) {
      fieldDef.scale = scale;
    }

    return fieldDef;
  }

  /**
   * Generate indexes for a field
   */
  private generateFieldIndexes(
    tableName: string,
    fieldName: string,
    propertyDef: unknown
  ): IndexDefinition[] {
    const indexes: IndexDefinition[] = [];

    // Primary key index
    if (this.isPrimaryKey(fieldName)) {
      indexes.push({
        name: `${tableName}_pkey`,
        fields: [fieldName],
        unique: true,
        type: "btree",
      });
    }

    // Unique field index
    if (this.isUniqueField(fieldName, propertyDef)) {
      indexes.push({
        name: `idx_${tableName}_${fieldName}_unique`,
        fields: [fieldName],
        unique: true,
        type: "btree",
      });
    }

    // Foreign key index
    if (this.isForeignKey(fieldName)) {
      indexes.push({
        name: `idx_${tableName}_${fieldName}_fk`,
        fields: [fieldName],
        unique: false,
        type: "btree",
      });
    }

    // Searchable field index
    if (this.isSearchableField(fieldName, propertyDef)) {
      indexes.push({
        name: `idx_${tableName}_${fieldName}_search`,
        fields: [fieldName],
        unique: false,
        type: "btree",
      });
    }

    return indexes;
  }

  /**
   * Generate table constraints
   */
  private generateTableConstraints(
    tableName: string,
    fields: FieldDefinition[]
  ): ConstraintDefinition[] {
    const constraints: ConstraintDefinition[] = [];

    // Primary key constraint
    const primaryKeyFields = fields
      .filter((field) => field.primary)
      .map((field) => field.name);

    if (primaryKeyFields.length > 0) {
      constraints.push({
        name: `${tableName}_pkey`,
        type: "primary_key",
        fields: primaryKeyFields,
      });
    }

    // Unique constraints
    const uniqueFields = Object.entries(fields)
      .filter(([_, field]) => field.unique)
      .map(([name, _]) => name);

    for (const fieldName of uniqueFields) {
      constraints.push({
        name: `${tableName}_${fieldName}_unique`,
        type: "unique",
        fields: [fieldName],
      });
    }

    // Not null constraints
    const notNullFields = Object.entries(fields)
      .filter(([_, field]) => !field.nullable)
      .map(([name, _]) => name);

    for (const fieldName of notNullFields) {
      constraints.push({
        name: `${tableName}_${fieldName}_not_null`,
        type: "not_null",
        fields: [fieldName],
      });
    }

    return constraints;
  }

  /**
   * Generate relations between tables
   */
  private generateRelations(tables: TableDefinition[]): void {
    for (const tableDef of tables) {
      const relations: RelationDefinition[] = [];

      for (const fieldDef of tableDef.fields) {
        if (this.isForeignKey(fieldDef.name)) {
          const targetTable = this.getTargetTable(fieldDef.name);
          if (targetTable && tables.find((t) => t.name === targetTable)) {
            relations.push({
              name: `${tableDef.name}_${fieldDef.name}_fk`,
              type: "many-to-one",
              target_table: targetTable,
              source_field: fieldDef.name,
              target_field: "id",
              cascade_delete: false,
            });
          }
        }
      }

      tableDef.relations = relations;
    }
  }

  // Helper methods

  private shouldGenerateTable(
    interfaceName: string,
    _interfaceDef: unknown
  ): boolean {
    // Skip internal interfaces and utility types
    const skipPatterns = [
      "ApiResponse",
      "PaginatedResponse",
      "QueryOptions",
      "FilterCondition",
    ];
    return !skipPatterns.some((pattern) => interfaceName.includes(pattern));
  }

  private shouldGenerateField(
    propertyName: string,
    _propertyDef: unknown
  ): boolean {
    // Skip internal properties and methods
    const skipProperties = ["constructor", "prototype", "__proto__"];
    return !skipProperties.includes(propertyName);
  }

  private getTableName(interfaceName: string): string {
    // Convert interface name to table name (e.g., AdminUser -> admin_users)
    return interfaceName
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "")
      .replace(/_+/g, "_");
  }

  private getFieldName(propertyName: string): string {
    // Convert property name to field name (e.g., firstName -> first_name)
    return propertyName
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "")
      .replace(/_+/g, "_");
  }

  private mapTypeScriptType(type: unknown): string {
    if (typeof type === "string") {
      return this.typeMapping[type] || "VARCHAR(255)";
    }

    // Handle union types
    if (Array.isArray(type)) {
      const baseType = type[0];
      return this.mapTypeScriptType(baseType);
    }

    // Handle object types
    if (typeof type === "object" && type !== null) {
      if ((type as { type?: unknown }).type) {
        return this.mapTypeScriptType((type as { type: unknown }).type);
      }
    }

    return "VARCHAR(255)";
  }

  private mapFieldType(type: string): FieldType {
    // Map SQL types to FieldType enum values
    if (type.startsWith("VARCHAR")) return FieldType.varchar;
    if (type.startsWith("DECIMAL")) return FieldType.decimal;
    if (type === "TIMESTAMP") return FieldType.timestamp;
    if (type === "INTEGER") return FieldType.integer;
    if (type === "BOOLEAN") return FieldType.boolean;
    if (type === "TEXT") return FieldType.text;
    if (type === "UUID") return FieldType.uuid;
    if (type === "JSON") return FieldType.json;
    if (type === "ARRAY") return FieldType.array;
    if (type === "OBJECT") return FieldType.object;
    if (type === "FILE") return FieldType.file;
    if (type === "IMAGE") return FieldType.image;
    if (type === "VIDEO") return FieldType.video;
    if (type === "AUDIO") return FieldType.audio;
    if (type === "REFERENCE") return FieldType.reference;
    if (type === "RELATION") return FieldType.relation;
    if (type === "ENUM") return FieldType.enum;
    if (type === "PASSWORD") return FieldType.password;
    if (type === "ENCRYPTED") return FieldType.encrypted;
    if (type === "EMAIL") return FieldType.email;
    if (type === "URL") return FieldType.url;
    if (type === "PHONE") return FieldType.phone;
    if (type === "UNIQUEID") return FieldType.uniqueID;
    if (type === "DATE") return FieldType.date;
    if (type === "DATETIME") return FieldType.datetime;
    if (type === "TIME") return FieldType.time;
    if (type === "NUMBER") return FieldType.number;
    if (type === "FLOAT") return FieldType.float;
    if (type === "STRING") return FieldType.string;

    return FieldType.string; // Default fallback
  }

  private isOptionalProperty(propertyDef: unknown): boolean {
    if (typeof propertyDef === "object" && propertyDef !== null) {
      return (
        (propertyDef as { optional?: boolean }).optional === true ||
        (propertyDef as { required?: boolean }).required === false
      );
    }
    return false;
  }

  private isPrimaryKey(propertyName: string): boolean {
    return propertyName === "id" || propertyName.endsWith("_id");
  }

  private isUniqueField(propertyName: string, _propertyDef: unknown): boolean {
    const uniquePatterns = ["email", "username", "key", "token", "uuid"];
    return uniquePatterns.some((pattern) => propertyName.includes(pattern));
  }

  private isForeignKey(propertyName: string): boolean {
    return propertyName.endsWith("_id") && propertyName !== "id";
  }

  private isSearchableField(
    propertyName: string,
    _propertyDef: unknown
  ): boolean {
    const searchablePatterns = [
      "name",
      "title",
      "description",
      "content",
      "text",
    ];
    return searchablePatterns.some((pattern) => propertyName.includes(pattern));
  }

  private getTargetTable(fieldName: string): string | null {
    // Extract table name from foreign key field (e.g., user_id -> users)
    const tableName = fieldName.replace(/_id$/, "");
    return `${tableName}s`; // Simple pluralization
  }

  private getSchemaVersion(): string {
    return "1.0.0";
  }

  // Checksum generation available for schema validation
  // @ts-expect-error - Method reserved for future use
  private _generateChecksum(schema: Record<string, TableDefinition>): string {
    // Simple checksum generation for schema validation
    const schemaString = JSON.stringify(schema, Object.keys(schema).sort());
    let hash = 0;
    for (let i = 0; i < schemaString.length; i++) {
      const char = schemaString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Load interfaces from a module or file
   */
  static loadInterfacesFromModule(
    _modulePath: string
  ): Record<string, unknown> {
    // This would dynamically load interfaces from a module
    // For now, return an empty object
    return {};
  }

  /**
   * Generate schema from a specific interface
   */
  static generateFromInterface(
    interfaceName: string,
    interfaceDef: unknown
  ): TableDefinition {
    const generator = new SchemaGenerator({ [interfaceName]: interfaceDef });
    const schema = generator.generateSchema();
    const tableName = generator.getTableName(interfaceName);
    const table = schema.tables.find((t) => t.name === tableName);
    if (!table) {
      throw new Error(`Table ${tableName} not found in schema`);
    }
    return table;
  }
}

// Configuration options for schema generation
interface SchemaGeneratorOptions {
  defaultStringLength?: number;
  defaultDecimalPrecision?: number;
  defaultDecimalScale?: number;
  generateIndexes?: boolean;
  generateConstraints?: boolean;
  generateRelations?: boolean;
}
