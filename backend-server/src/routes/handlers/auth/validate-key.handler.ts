import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for validating API key
 * POST /krapi/k1/auth/validate-key
 * 
 * SDK-FIRST: Uses backendSDK.apiKeys.validateKey() instead of custom implementation.
 */
export class ValidateKeyHandler {
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

      const { api_key } = req.body;

      if (!api_key) {
        res.status(400).json({
          success: false,
          error: "API key is required",
        });
        return;
      }

      // SDK-FIRST: Use backendSDK.apiKeys.validateKey()
      const result = await this.backendSDK.apiKeys.validateKey(api_key);

      res.json({
        success: true,
        valid: result.valid,
        key_info: result.key_info,
      });
    } catch (error) {
      console.error("Validate API key error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to validate API key",
      });
    }
  }
}



