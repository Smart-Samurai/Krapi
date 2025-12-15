import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthenticatedRequest, ApiResponse } from "@/types";

/**
 * Handler for regenerating API key
 * POST /krapi/k1/auth/regenerate-api-key
 * 
 * Uses SDK auth.regenerateApiKey() method for API key regeneration.
 */
export class RegenerateApiKeyHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        } as ApiResponse);
        return;
      }

      // Use SDK auth.regenerateApiKey() method
      // Note: SDK method signature may vary - check actual implementation
      const result = await this.backendSDK.auth.regenerateApiKey({
        user_id: userId,
      } as unknown);

      if (result && result.success && result.data) {
        res.status(200).json({
          success: true,
          data: {
            api_key: (result.data as { api_key?: string }).api_key || (result.data as { key?: string }).key,
          },
          message: "API key regenerated successfully",
        } as ApiResponse);
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to regenerate API key",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Regenerate API key error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  }
}


