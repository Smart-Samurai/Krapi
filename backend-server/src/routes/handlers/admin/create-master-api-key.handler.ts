import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response } from "express";

/**
 * Handler for creating a master API key
 * POST /admin/master-api-keys
 */
export class CreateMasterApiKeyHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: unknown, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const apiKey = await this.backendSDK.admin.createMasterApiKey();
      res.status(201).json({ success: true, data: apiKey });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create master API key",
      });
    }
  }
}

