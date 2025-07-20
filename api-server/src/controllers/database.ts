import { Response } from "express";
import path from "path";
import fs from "fs";
import database from "../services/database";
import { AuthenticatedRequest } from "../middleware/auth";

export class DatabaseController {
  /**
   * Get database information including tables and statistics
   */
  static async getDatabaseInfo(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Get table information
      const tables = database.getAllTables();

      // Get database file stats
      const dbPath = path.join(__dirname, "../../data/app.db");
      const stats = fs.statSync(dbPath);

      // Calculate total records across all tables
      let totalRecords = 0;
      for (const table of tables) {
        totalRecords += table.rowCount;
      }

      res.json({
        success: true,
        tables,
        stats: {
          fileSize: stats.size,
          totalRecords,
          lastModified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching database info:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch database information",
      });
    }
  }

  /**
   * Get data from a specific table
   */
  static async getTableData(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const tableName = req.params.tableName;

      // Validate table name to prevent SQL injection
      if (!database.isValidTableName(tableName)) {
        res.status(400).json({
          success: false,
          error: "Invalid table name",
        });
        return;
      }

      const start = Date.now();
      const result = database.getTableData(tableName);
      const executionTime = Date.now() - start;

      res.json({
        success: true,
        columns: result.columns,
        rows: result.rows,
        executionTime,
      });
    } catch (error) {
      console.error("Error fetching table data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch table data",
      });
    }
  }

  /**
   * Execute a custom SQL query
   */
  static async executeQuery(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string") {
        res.status(400).json({
          success: false,
          error: "Query is required",
        });
        return;
      }

      // Check for dangerous operations
      const dangerousOperations = [
        /DROP\s+TABLE/i,
        /DROP\s+DATABASE/i,
        /DELETE\s+FROM/i,
        /TRUNCATE\s+TABLE/i,
        /ALTER\s+TABLE/i,
        /ATTACH\s+DATABASE/i,
      ];

      for (const pattern of dangerousOperations) {
        if (pattern.test(query)) {
          res.status(403).json({
            success: false,
            error:
              "Dangerous operation not allowed. Use the appropriate API endpoints for data modifications.",
          });
          return;
        }
      }

      const start = Date.now();
      const result = database.executeQuery(query);
      const executionTime = Date.now() - start;

      res.json({
        success: true,
        columns: result.columns,
        rows: result.rows,
        executionTime,
      });
    } catch (error: any) {
      console.error("Error executing query:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to execute query",
      });
    }
  }

  /**
   * Export database as JSON
   */
  static async exportDatabase(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const data = database.exportDatabase();

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="krapi-db-export-${
          new Date().toISOString().split("T")[0]
        }.json"`
      );
      res.send(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error exporting database:", error);
      res.status(500).json({
        success: false,
        error: "Failed to export database",
      });
    }
  }

  /**
   * Reset database to initial state
   */
  static async resetDatabase(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Close the database connection
      database.close();

      // Delete the database file
      const dbPath = path.join(__dirname, "../../data/app.db");
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }

      // Reinitialize the database
      database.reinitialize();

      res.json({
        success: true,
        message: "Database has been reset successfully",
      });
    } catch (error) {
      console.error("Error resetting database:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reset database",
      });
    }
  }

  /**
   * Get all tables
   */
  static async getTables(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const tables = database.getAllTables();

      res.json({
        success: true,
        data: tables,
        message: `Retrieved ${tables.length} tables`,
      });
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch tables",
      });
    }
  }

  /**
   * Create a new table (placeholder - not implemented in database service)
   */
  static async createTable(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      res.status(501).json({
        success: false,
        error: "Table creation not implemented yet",
      });
    } catch (error) {
      console.error("Error creating table:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create table",
      });
    }
  }

  /**
   * Get database statistics
   */
  static async getStats(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const tables = database.getAllTables();
      const dbPath = path.join(__dirname, "../../data/app.db");
      const stats = fs.statSync(dbPath);

      // Calculate statistics
      let totalRecords = 0;
      const tableStats = tables.map((table) => {
        totalRecords += table.rowCount;
        return {
          name: table.name,
          rowCount: table.rowCount,
          columns: table.columns.length,
        };
      });

      const databaseStats = {
        tables: tableStats,
        summary: {
          totalTables: tables.length,
          totalRecords,
          databaseSize: stats.size,
          lastModified: stats.mtime.toISOString(),
        },
      };

      res.json({
        success: true,
        data: databaseStats,
        message: "Database statistics retrieved successfully",
      });
    } catch (error) {
      console.error("Error fetching database stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch database statistics",
      });
    }
  }
}
