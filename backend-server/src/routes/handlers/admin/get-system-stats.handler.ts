import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response } from "express";

/**
 * Handler for getting system statistics
 * GET /admin/system/stats
 */
export class GetSystemStatsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: unknown, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const stats = await this.backendSDK.admin.getSystemStats();
      res.json({ success: true, data: stats });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get system stats",
      });
    }
  }
}

