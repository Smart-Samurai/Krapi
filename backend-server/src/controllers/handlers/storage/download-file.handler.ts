import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { StorageService } from "@/services/storage.service";
import { ApiResponse } from "@/types";

/**
 * Handler for downloading a file
 * GET /krapi/k1/projects/:projectId/storage/files/:fileId/download
 * 
 * Downloads a file and automatically decrypts it if encrypted.
 * Uses StorageService which handles decryption automatically.
 */
export class DownloadFileHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, fileId } = req.params;
      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      // Get file info using SDK
      const file = await this.backendSDK.storage.getFileById(projectId, fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: "File not found",
        });
        return;
      }

      // Use StorageService to download the file (which handles decryption)
      const storageService = StorageService.getInstance();
      const fileData = await storageService.downloadFile(fileId);

      // Set headers for file download
      res.setHeader("Content-Type", fileData.mime_type || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileData.filename}"`
      );
      res.setHeader("Content-Length", fileData.buffer.length);

      // Send decrypted file
      res.send(fileData.buffer);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to download file",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      } as ApiResponse);
    }
  }
}


