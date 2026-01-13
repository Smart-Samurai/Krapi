import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { StorageService } from "@/services/storage.service";

/**
 * Handler for downloading a file
 * GET /storage/download/:fileId
 * 
 * Downloads a file and automatically decrypts it if encrypted.
 * Uses StorageService which handles decryption automatically.
 */
export class DownloadFileHandler {
  constructor(_backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const params = req.params as Record<string, string>;
      const projectId = params.projectId;

      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        });
        return;
      }

      // Use StorageService to download the file (which handles decryption)
      const storageService = StorageService.getInstance();
      const fileInfo = await storageService.getFileInfo(fileId);

      let fileData;
      try {
        fileData = await storageService.downloadFile(fileId);
      } catch (error) {
        if (error instanceof Error && error.message.includes("File not found")) {
          res.status(404).json({
            success: false,
            error: "File not found",
          });
          return;
        }
        throw error;
      }

      // Set headers for file download
      const filename =
        fileInfo?.original_name || fileInfo?.filename || fileData.filename;

      res.setHeader(
        "Content-Type",
        fileInfo?.mime_type || fileData.mime_type || "application/octet-stream"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
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
      });
    }
  }
}

