import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting storage info
 * GET /storage/info
 */
export class GetStorageInfoHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const params = req.params as Record<string, string>;
      const projectId = params.projectId;

      if (!projectId) {
        res.status(400).json({ success: false, error: "Project ID is required" });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      // Type assertion needed as SDK types may not be fully updated
      const storageService = this.backendSDK.storage as unknown as {
        getInfo: (projectId: string) => Promise<{
          total_files: number;
          total_size: number;
          storage_used_percentage: number;
          quota: number;
        }>;
      };

      const info = await storageService.getInfo(projectId);

      res.status(200).json({ success: true, data: info });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get storage info",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      });
    }
  }
}

