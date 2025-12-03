import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for system settings
 * GET /krapi/k1/system/settings
 */
export class SystemSettingsHandler {
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

      const settings = await this.backendSDK.system.getSettings();

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("System settings error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get system settings",
      });
    }
  }
}
