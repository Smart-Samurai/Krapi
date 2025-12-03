import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting user API keys
 * GET /admin/users/:userId/api-keys
 */
export class GetUserApiKeysHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ success: false, error: "User ID is required" });
        return;
      }

      const apiKeys = await this.backendSDK.admin.getUserApiKeys(userId);
      res.json({ success: true, data: apiKeys });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user API keys",
      });
    }
  }
}

