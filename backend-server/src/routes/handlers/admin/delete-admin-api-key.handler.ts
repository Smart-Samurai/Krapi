import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for deleting an admin API key
 * DELETE /admin/api-keys/:keyId
 */
export class DeleteAdminApiKeyHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { keyId } = req.params;
      if (!keyId) {
        res.status(400).json({ success: false, error: "API key ID is required" });
        return;
      }

      const success = await this.backendSDK.admin.deleteApiKey(keyId);

      if (!success) {
        res.status(404).json({ success: false, error: "API key not found" });
        return;
      }

      res.json({ success: true, message: "API key deleted successfully" });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete API key",
      });
    }
  }
}

