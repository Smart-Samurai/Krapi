import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response } from "express";

/**
 * Handler for repairing database
 * POST /admin/system/db-repair
 */
export class RepairDatabaseHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: unknown, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const repairResult = await this.backendSDK.autoFixDatabase();
      res.json({
        success: repairResult.success,
        message:
          "message" in repairResult
            ? repairResult.message
            : "Database repair completed",
        actions: repairResult,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to repair database",
      });
    }
  }
}

