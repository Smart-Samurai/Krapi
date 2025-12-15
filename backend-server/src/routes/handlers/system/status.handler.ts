import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for system status
 * GET /krapi/k1/system/status
 */
export class SystemStatusHandler {
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

      const status = {
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV || "development",
        },
        database: {
          status: "connected", // Simplified - actual check would be more complex
        },
        timestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error("System status error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "System status check failed",
      });
    }
  }
}
