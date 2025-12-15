import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for database repair
 * POST /krapi/k1/health/repair
 * 
 * SDK-FIRST: Uses backendSDK.health.repairDatabase() instead of custom implementation.
 */
export class RepairHandler {
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

      // SDK-FIRST: Use backendSDK.database.autoFix() for database repair
      // HealthService doesn't have repairDatabase/autoFix, but DatabaseHealthManager does
      const result = await this.backendSDK.database.autoFix();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Database repair error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Database repair failed",
      });
    }
  }
}


