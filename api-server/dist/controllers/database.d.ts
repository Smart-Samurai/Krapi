import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare class DatabaseController {
    /**
     * Get database information including tables and statistics
     */
    static getDatabaseInfo(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get data from a specific table
     */
    static getTableData(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Execute a custom SQL query
     */
    static executeQuery(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Export database as JSON
     */
    static exportDatabase(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Reset database to initial state
     */
    static resetDatabase(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get all tables
     */
    static getTables(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Create a new table (placeholder - not implemented in database service)
     */
    static createTable(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get database statistics
     */
    static getStats(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=database.d.ts.map