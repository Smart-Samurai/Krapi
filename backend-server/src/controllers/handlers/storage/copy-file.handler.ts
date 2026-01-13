import * as fs from "fs/promises";
import * as path from "path";

import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for copying a file
 * POST /krapi/k1/projects/:projectId/files/copy
 * 
 * Uses SDK methods to read original file and upload as new file (copy operation).
 */
export class CopyFileHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { fileId, newName, destinationFolderId } = req.body;

      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        } as ApiResponse);
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const uploadedBy = authReq.user?.id || authReq.session?.user_id || "system";

      // Get original file using SDK
      const originalFile = await this.backendSDK.storage.getFileById(projectId, fileId);
      if (!originalFile) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      // Get file path and read file content
      const filePath = await this.backendSDK.storage.getFileUrl(projectId, fileId);
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(process.cwd(), filePath);
      const fileBuffer = await fs.readFile(fullPath);

      // Upload as new file using SDK
      const copiedFile = await this.backendSDK.storage.uploadFile(
        projectId,
        {
          original_name: newName || `Copy of ${originalFile.original_name}`,
          file_size: originalFile.file_size,
          mime_type: originalFile.mime_type,
          uploaded_by: uploadedBy,
          folder_id: destinationFolderId || originalFile.folder_id,
          tags: originalFile.tags,
          metadata: originalFile.metadata,
          is_public: originalFile.is_public,
        },
        fileBuffer
      );

      res.json({
        success: true,
        data: copiedFile,
        message: "File copied successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error copying file:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to copy file",
      } as ApiResponse);
    }
  }
}

