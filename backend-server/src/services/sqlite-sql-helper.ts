/**
 * SQLite SQL Helper
 * 
 * Helper functions for generating SQLite-compatible SQL and converting PostgreSQL SQL to SQLite.
 * Provides utilities for UUID generation and SQL conversion for SQLite compatibility.
 * 
 * @module services/sqlite-sql-helper
 * @example
 * import { generateUUID, convertToSQLite } from './sqlite-sql-helper';
 * const uuid = generateUUID();
 * const sqliteSQL = convertToSQLite(postgresSQL);
 */

/**
 * Generate a UUID in SQLite-compatible format
 * 
 * SQLite doesn't have UUID type or gen_random_uuid() function.
 * This generates UUIDs in JavaScript using RFC4122 format.
 * 
 * @returns {string} Generated UUID string
 * 
 * @example
 * const uuid = generateUUID();
 * // Returns: "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert PostgreSQL SQL to SQLite-compatible SQL
 * 
 * Converts PostgreSQL-specific SQL syntax to SQLite-compatible syntax.
 * Handles type conversions, function replacements, and syntax differences.
 * 
 * @param {string} sql - PostgreSQL SQL query
 * @returns {string} SQLite-compatible SQL query
 * 
 * @example
 * const postgresSQL = "CREATE TABLE users (id UUID PRIMARY KEY, data JSONB)";
 * const sqliteSQL = convertToSQLite(postgresSQL);
 * // Returns: "CREATE TABLE users (id TEXT PRIMARY KEY, data TEXT)"
 */
export function convertToSQLite(sql: string): string {
  // Replace UUID type with TEXT
  sql = sql.replace(/\bUUID\b/gi, 'TEXT');
  
  // Replace gen_random_uuid() with a placeholder (will be handled by JS)
  // Actually, we'll handle this at runtime
  
  // Replace TEXT[] with TEXT (arrays stored as JSON)
  sql = sql.replace(/\bTEXT\[\]\b/gi, 'TEXT');
  
  // Replace JSONB with TEXT (JSON stored as TEXT in SQLite)
  sql = sql.replace(/\bJSONB\b/gi, 'TEXT');
  
  // Replace '{}'::jsonb with '{}' (remove PostgreSQL casting)
  sql = sql.replace(/::jsonb/gi, '');
  sql = sql.replace(/::text/gi, '');
  
  // Replace TIMESTAMP WITH TIME ZONE with TEXT
  sql = sql.replace(/\bTIMESTAMP WITH TIME ZONE\b/gi, 'TEXT');
  
  // Replace BIGINT with INTEGER (SQLite doesn't distinguish)
  sql = sql.replace(/\bBIGINT\b/gi, 'INTEGER');
  
  // Replace BOOLEAN with INTEGER (SQLite uses 0/1)
  sql = sql.replace(/\bBOOLEAN\b/gi, 'INTEGER');
  
  // Remove WHERE clauses from CREATE INDEX (SQLite partial indexes need different syntax)
  // We'll handle this manually for each index
  
  // Remove CREATE OR REPLACE FUNCTION (SQLite doesn't support functions)
  // Triggers will be handled separately
  
  return sql;
}

/**
 * Get SQLite-compatible UUID default value SQL
 * 
 * Since SQLite doesn't support functions in DEFAULT clauses, this returns the type
 * that should be used for UUID columns. UUIDs are generated in application code.
 * 
 * @returns {string} SQLite type for UUID columns (TEXT)
 * 
 * @example
 * const uuidType = getUUIDDefaultSQL();
 * // Returns: "TEXT"
 */
export function getUUIDDefaultSQL(): string {
  // SQLite doesn't support functions in DEFAULT, so we'll use NULL and generate in code
  return "TEXT";
}

