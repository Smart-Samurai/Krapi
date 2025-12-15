import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";
import * as fs from "fs/promises";
import * as path from "path";

import { ApiResponse } from "@/types";

/**
 * Handler for downloading a file
 * GET /krapi/k1/projects/:projectId/storage/files/:fileId/download
 * 
 * Uses SDK storage.getFileById() and storage.getFileUrl() methods for file retrieval.
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
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // Get file info using SDK
      const file = await this.backendSDK.storage.getFileById(projectId, fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      // Get file path/URL using SDK
      const filePath = await this.backendSDK.storage.getFileUrl(projectId, fileId);
      
      // Read file from storage
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(process.cwd(), filePath);
      
      const fileBuffer = await fs.readFile(fullPath);

      // Set headers for file download
      res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.original_name}"`
      );
      res.setHeader("Content-Length", file.file_size);

      // Send file
      res.send(fileBuffer);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to download file",
      } as ApiResponse);
    }
  }
}


