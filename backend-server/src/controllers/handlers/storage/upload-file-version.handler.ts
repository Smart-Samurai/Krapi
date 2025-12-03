import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";
import * as path from "path";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for uploading a new file version
 * POST /krapi/k1/projects/:projectId/files/:fileId/versions
 */
export class UploadFileVersionHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      const { projectId, fileId } = req.params;

      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        } as ApiResponse);
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "File upload is required",
        } as ApiResponse);
        return;
      }

      // Get current file to determine next version number
      const currentFile = await this.backendSDK.storage.getFileById(projectId, fileId);
      if (!currentFile) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      // Get existing versions to determine next version number
      const existingVersions = await this.backendSDK.storage.getFileVersions(fileId);
      const nextVersionNumber = existingVersions.length > 0 
        ? Math.max(...existingVersions.map(v => v.version_number)) + 1
        : 1;

      // Read file buffer
      const fileBuffer = Buffer.from(req.file.buffer);
      
      // Generate file hash (simplified - SDK might have this)
      const crypto = await import("crypto");
      const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      // Use SDK storage.createFileVersion() method
      const authReq = req as AuthenticatedRequest;
      const uploadedBy = authReq.user?.id || authReq.session?.user_id || "system";
      
      // Get file path for storage
      const filePath = await this.backendSDK.storage.getFileUrl(projectId, fileId);
      const storagePath = path.dirname(filePath);

      const newVersion = await this.backendSDK.storage.createFileVersion(fileId, {
        version_number: nextVersionNumber,
        file_name: req.file.originalname,
        file_path: filePath,
        file_size: req.file.size,
        file_hash: fileHash,
        storage_path: storagePath,
        uploaded_by: uploadedBy,
        is_current: true, // New version becomes current
      });

      res.json({
        success: true,
        data: newVersion,
        message: "File version uploaded successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error uploading file version:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file version",
      } as ApiResponse);
    }
  }
}

