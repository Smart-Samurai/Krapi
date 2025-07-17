"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseController = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = __importDefault(require("../services/database"));
class DatabaseController {
    /**
     * Get database information including tables and statistics
     */
    static async getDatabaseInfo(req, res) {
        try {
            // Get table information
            const tables = database_1.default.getAllTables();
            // Get database file stats
            const dbPath = path_1.default.join(__dirname, "../../data/app.db");
            const stats = fs_1.default.statSync(dbPath);
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
        }
        catch (error) {
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
    static async getTableData(req, res) {
        try {
            const tableName = req.params.name;
            // Validate table name to prevent SQL injection
            if (!database_1.default.isValidTableName(tableName)) {
                res.status(400).json({
                    success: false,
                    error: "Invalid table name",
                });
                return;
            }
            const start = Date.now();
            const result = database_1.default.getTableData(tableName);
            const executionTime = Date.now() - start;
            res.json({
                success: true,
                columns: result.columns,
                rows: result.rows,
                executionTime,
            });
        }
        catch (error) {
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
    static async executeQuery(req, res) {
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
                        error: "Dangerous operation not allowed. Use the appropriate API endpoints for data modifications.",
                    });
                    return;
                }
            }
            const start = Date.now();
            const result = database_1.default.executeQuery(query);
            const executionTime = Date.now() - start;
            res.json({
                success: true,
                columns: result.columns,
                rows: result.rows,
                executionTime,
            });
        }
        catch (error) {
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
    static async exportDatabase(req, res) {
        try {
            const data = database_1.default.exportDatabase();
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", `attachment; filename="krapi-db-export-${new Date().toISOString().split("T")[0]}.json"`);
            res.send(JSON.stringify(data, null, 2));
        }
        catch (error) {
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
    static async resetDatabase(req, res) {
        try {
            // Close the database connection
            database_1.default.close();
            // Delete the database file
            const dbPath = path_1.default.join(__dirname, "../../data/app.db");
            if (fs_1.default.existsSync(dbPath)) {
                fs_1.default.unlinkSync(dbPath);
            }
            // Reinitialize the database
            database_1.default.reinitialize();
            res.json({
                success: true,
                message: "Database has been reset successfully",
            });
        }
        catch (error) {
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
    static async getTables(req, res) {
        try {
            const tables = database_1.default.getAllTables();
            res.json({
                success: true,
                data: tables,
                message: `Retrieved ${tables.length} tables`,
            });
        }
        catch (error) {
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
    static async createTable(req, res) {
        try {
            res.status(501).json({
                success: false,
                error: "Table creation not implemented yet",
            });
        }
        catch (error) {
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
    static async getStats(req, res) {
        try {
            const tables = database_1.default.getAllTables();
            const dbPath = path_1.default.join(__dirname, "../../data/app.db");
            const stats = fs_1.default.statSync(dbPath);
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
        }
        catch (error) {
            console.error("Error fetching database stats:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch database statistics",
            });
        }
    }
}
exports.DatabaseController = DatabaseController;
//# sourceMappingURL=database.js.map