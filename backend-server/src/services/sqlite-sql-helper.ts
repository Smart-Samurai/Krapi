/**
 * SQLite SQL Helper
 * 
 * Helper functions for generating SQLite-compatible SQL
 */

/**
 * Generate a UUID in SQLite-compatible format
 * SQLite doesn't have UUID type or gen_random_uuid() function
 * We'll generate UUIDs in JavaScript instead
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
 * Generate SQLite-compatible UUID default value
 * Since SQLite doesn't support functions in DEFAULT, we'll handle this in application code
 */
export function getUUIDDefaultSQL(): string {
  // SQLite doesn't support functions in DEFAULT, so we'll use NULL and generate in code
  return "TEXT";
}

