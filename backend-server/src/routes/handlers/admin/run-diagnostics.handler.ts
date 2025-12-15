import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response } from "express";

/**
 * Handler for running system diagnostics
 * POST /admin/system/diagnostics
 */
export class RunDiagnosticsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: unknown, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const diagnostics = await this.backendSDK.health.runDiagnostics();
      res.json({ success: true, data: diagnostics });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to run diagnostics",
      });
    }
  }
}

