import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting activity logs
 * GET /admin/activity
 */
export class GetActivityLogsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { limit = 100, offset = 0 } = req.query;
      const logs = await this.backendSDK.admin.getActivityLogs({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get activity logs",
      });
    }
  }
}

