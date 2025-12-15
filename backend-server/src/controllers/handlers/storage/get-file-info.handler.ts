import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";

/**
 * Handler for getting file info
 * GET /krapi/k1/projects/:projectId/storage/files/:fileId
 * 
 * Uses SDK storage.getFileById() method for file retrieval.
 */
export class GetFileInfoHandler {
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

      // Use SDK storage.getFileById() method
      const file = await this.backendSDK.storage.getFileById(projectId, fileId);

      if (!file) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: file.id,
          filename: file.original_name,
          size: file.file_size,
          mime_type: file.mime_type,
          uploaded_at: file.created_at,
          uploaded_by: file.uploaded_by,
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Get file info error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get file info",
      } as ApiResponse);
    }
  }
}


