import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for health statistics
 * GET /krapi/k1/health/stats
 * 
 * SDK-FIRST: Uses backendSDK.health.getStats() instead of custom implementation.
 */
export class HealthStatsHandler {
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

      // SDK-FIRST: Use backendSDK.database.healthCheck() since getStats() doesn't exist
      // Note: getStats() is not available in IHealthService, using database.healthCheck() instead
      const stats = await this.backendSDK.database.healthCheck();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Health stats error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get health stats",
      });
    }
  }
}


