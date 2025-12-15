import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for database migration
 * POST /krapi/k1/health/migrate
 * 
 * SDK-FIRST: Uses backendSDK.health.migrate() instead of custom implementation.
 */
export class MigrateHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
        return;
      }

      // SDK-FIRST: Use backendSDK.database.migrate() (DatabaseHealthManager method)
      const result = await this.backendSDK.database.migrate();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Migration failed",
      });
    }
  }
}


