import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for activity cleanup
 * POST /krapi/k1/activity/cleanup
 * 
 * SDK-FIRST: Uses backendSDK.activity.cleanup() if available.
 * Note: SDK may not have cleanup method yet.
 */
export class ActivityCleanupHandler {
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

      const body = req.body || {};
      const daysToKeep = body.days_to_keep || 30;

      // SDK-FIRST: Use backendSDK.activity.cleanOldLogs()
      // Note: ActivityLogger has cleanOldLogs(daysToKeep?)
      const deletedCount = await this.backendSDK.activity.cleanOldLogs(daysToKeep);
      res.json({
        success: true,
        data: {
          success: true,
          deleted_count: deletedCount,
        },
      });
    } catch (error) {
      console.error("Activity cleanup error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Activity cleanup failed",
      });
    }
  }
}


