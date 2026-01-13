import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for system information
 * GET /krapi/k1/system/info
 * 
 * SDK-FIRST: Uses backendSDK.system.getInfo() instead of custom implementation.
 */
export class SystemInfoHandler {
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

      // SDK-FIRST: Use backendSDK.system.getSystemInfo() (service method)
      // SystemService returns ApiResponse<SystemInfo>
      const infoResult = await this.backendSDK.system.getSystemInfo();
      let info: Record<string, unknown>;
      if (infoResult && typeof infoResult === 'object' && 'data' in infoResult) {
        // ApiResponse format - extract data
        const data = (infoResult as { data: unknown }).data;
        info = (data as unknown) as Record<string, unknown>;
      } else {
        // Direct format (shouldn't happen but handle it)
        info = (infoResult as unknown) as Record<string, unknown>;
      }

      // Ensure version field exists - if not, add it from package.json or default
      if (!info.version) {
        try {
          // Use dynamic import for package.json
          const packageJson = await import('../../../../package.json');
          info.version = packageJson.version || '1.0.0';
        } catch {
          info.version = '1.0.0';
        }
      }

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      console.error("System info error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get system info",
      });
    }
  }
}
