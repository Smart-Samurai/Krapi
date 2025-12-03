import { Request, Response } from "express";

import { DatabaseHealthService } from "@/services/database/health/database-health.service";
import { MultiDatabaseManager } from "@/services/multi-database-manager.service";

/**
 * Handler for database health check
 * GET /krapi/k1/health/database
 */
export class DatabaseHealthHandler {
  private healthService: DatabaseHealthService;

  constructor() {
    // Create MultiDatabaseManager instance (same pattern as DatabaseService)
    const mainDbPath =
      process.env.DB_PATH || process.env.SQLITE_DB_PATH || undefined;
    const projectsDbDir = process.env.PROJECTS_DB_DIR || undefined;
    const dbManager = new MultiDatabaseManager(mainDbPath, projectsDbDir);
    this.healthService = new DatabaseHealthService(dbManager);
  }

  async handle(_req: Request, res: Response): Promise<void> {
    try {
      const health = await this.healthService.checkHealth();

      // Return SDK-compatible format
      // SDK expects: { healthy: boolean, message: string, details?: Record<string, unknown> }
      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      console.error("Database health check error:", error);
      res.status(500).json({
        success: false,
        error: "Database health check failed",
        data: {
          healthy: false,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }
}

