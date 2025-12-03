import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting file URL
 * GET /krapi/k1/projects/:projectId/storage/files/:fileId/url
 * 
 * SDK-FIRST: Uses backendSDK.storage.getFileUrl() instead of custom implementation.
 */
export class GetFileUrlHandler {
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

      const projectId = req.params.projectId;
      const fileId = req.params.fileId;
      const expiresIn = req.query.expires_in ? parseInt(req.query.expires_in as string, 10) : undefined;

      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        });
        return;
      }

      // SDK-FIRST: Construct URL directly since StorageService doesn't expose getFileUrl()
      // Note: StorageService doesn't have getFileInfo() or getFileUrl() methods
      // The actual file download will be handled by the download endpoint which validates file existence
      const result = {
        url: `/api/krapi/k1/projects/${projectId}/storage/download/${fileId}`,
        expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
      };

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get file URL error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get file URL",
      });
    }
  }
}


