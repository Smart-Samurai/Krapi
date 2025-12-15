import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for auto-fix database issues
 * POST /krapi/k1/health/auto-fix
 * 
 * SDK-FIRST: Uses backendSDK.health.autoFix() instead of custom implementation.
 */
export class AutoFixHandler {
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

      // SDK-FIRST: Use backendSDK.database.autoFix() (DatabaseHealthManager method)
      const result = await this.backendSDK.database.autoFix();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Auto-fix error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Auto-fix failed",
      });
    }
  }
}


