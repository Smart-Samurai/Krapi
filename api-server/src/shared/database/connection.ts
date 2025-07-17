/**
 * Database Connection Utility
 * 
 * This file manages the SQLite database connection using better-sqlite3.
 * It provides a singleton pattern to ensure only one database connection
 * is used throughout the application.
 */

import Database from "better-sqlite3";
import path from "path";

class DatabaseConnection {
  private static instance: Database.Database | null = null;
  private static readonly DB_PATH = path.join(process.cwd(), "data", "cms.db");

  /**
   * Get the database instance (singleton pattern)
   */
  static getInstance(): Database.Database {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new Database(DatabaseConnection.DB_PATH);
      DatabaseConnection.setupDatabase();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initialize database with required settings
   */
  private static setupDatabase(): void {
    if (!DatabaseConnection.instance) return;

    // Enable foreign key constraints
    DatabaseConnection.instance.pragma("foreign_keys = ON");
    
    // Set WAL mode for better concurrent access
    DatabaseConnection.instance.pragma("journal_mode = WAL");
    
    // Optimize synchronous mode
    DatabaseConnection.instance.pragma("synchronous = NORMAL");
    
    // Set reasonable cache size
    DatabaseConnection.instance.pragma("cache_size = 10000");
    
    console.log("Database connection established and configured");
  }

  /**
   * Close the database connection
   */
  static close(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.close();
      DatabaseConnection.instance = null;
      console.log("Database connection closed");
    }
  }

  /**
   * Execute a query safely with error handling
   */
  static safeExecute<T = any>(
    query: string, 
    params: any[] = []
  ): { success: boolean; data?: T; error?: string } {
    try {
      const db = DatabaseConnection.getInstance();
      const stmt = db.prepare(query);
      const result = stmt.all(...params) as T;
      return { success: true, data: result };
    } catch (error) {
      console.error("Database query error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown database error"
      };
    }
  }

  /**
   * Check if database is healthy
   */
  static healthCheck(): { healthy: boolean; error?: string } {
    try {
      const db = DatabaseConnection.getInstance();
      db.prepare("SELECT 1").get();
      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : "Database health check failed"
      };
    }
  }
}

export default DatabaseConnection;