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

      // Try to use SDK's getInfo if available, otherwise calculate from files
      let info: { total_files: number; total_size: number; storage_used_percentage: number; quota: number };
      
      // Type assertion to check for getInfo method
      const storageService = this.backendSDK.storage as unknown as {
        getInfo?: (projectId: string) => Promise<typeof info>;
        getFiles?: (projectId: string) => Promise<{ size?: number }[]>;
      };

      if (typeof storageService.getInfo === "function") {
        info = await storageService.getInfo(projectId);
      } else if (typeof storageService.getFiles === "function") {
        // Fallback: calculate from files list
        const files = await storageService.getFiles(projectId);
        const totalFiles = files.length;
        const totalSize = files.reduce((sum: number, file: { size?: number }) => sum + (file.size || 0), 0);
        const defaultQuota = 10 * 1024 * 1024 * 1024; // 10GB
        
        info = {
          total_files: totalFiles,
          total_size: totalSize,
          storage_used_percentage: defaultQuota > 0 ? (totalSize / defaultQuota) * 100 : 0,
          quota: defaultQuota,
        };
      } else {
        // Neither method available - return empty storage info
        info = {
          total_files: 0,
          total_size: 0,
          storage_used_percentage: 0,
          quota: 10 * 1024 * 1024 * 1024, // 10GB default
        };
      }

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

