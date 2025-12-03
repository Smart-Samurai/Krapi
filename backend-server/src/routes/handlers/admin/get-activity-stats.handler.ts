import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting activity statistics
 * GET /admin/activity/stats
 */
export class GetActivityStatsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { project_id, days } = req.query;
      const stats = await this.backendSDK.activity.getActivityStats(
        project_id ? (project_id as string) : undefined,
        days ? parseInt(days as string) : 30
      );

      res.json({ success: true, ...stats });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get activity statistics",
      });
    }
  }
}

