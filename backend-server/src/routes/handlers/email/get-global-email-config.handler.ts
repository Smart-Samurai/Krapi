import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response } from "express";

/**
 * Handler for getting global email configuration
 * GET /email/config
 */
export class GetGlobalEmailConfigHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: unknown, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      // Get system-wide email configuration from settings
      const settings = await this.backendSDK.system.getSettings();
      const config = (settings as { email?: unknown })?.email || {};

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error("Error getting email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email configuration",
      });
    }
  }
}








