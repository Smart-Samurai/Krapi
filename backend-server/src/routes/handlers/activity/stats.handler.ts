import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for activity statistics
 * GET /krapi/k1/activity/stats
 * 
 * SDK-FIRST: Uses backendSDK.activity.getStats() instead of custom implementation.
 */
export class ActivityStatsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
        return;
      }

      const projectId = req.query.project_id as string | undefined;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;

      // SDK should have fixed hanging issues, but keep timeout as safety (increased to 5s)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Activity stats query timeout after 5s")), 5000);
      });

      // SDK-FIRST: Use backendSDK.activity.getActivityStats()
      // Note: ActivityLogger has getActivityStats(projectId?, days?)
      const stats = await Promise.race([
        this.backendSDK.activity.getActivityStats(projectId, days),
        timeoutPromise,
      ]) as unknown;

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Activity stats error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get activity stats",
      });
    }
  }
}


