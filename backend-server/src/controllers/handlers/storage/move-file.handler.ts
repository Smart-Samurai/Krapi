import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for moving a file
 * POST /krapi/k1/projects/:projectId/files/move
 * 
 * Uses SDK storage.updateFile() method to change folder_id (move operation).
 */
export class MoveFileHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { fileId, destinationFolderId } = req.body;

      if (!projectId || !fileId || !destinationFolderId) {
        res.status(400).json({
          success: false,
          error: "Project ID, file ID, and destination folder ID are required",
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
      const updatedBy = authReq.user?.id || authReq.session?.user_id || "system";

      // Use SDK storage.updateFile() to move file (change folder_id)
      const movedFile = await this.backendSDK.storage.updateFile(
        projectId,
        fileId,
        { folder_id: destinationFolderId },
        updatedBy
      );

      if (!movedFile) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: movedFile,
        message: "File moved successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error moving file:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to move file",
      } as ApiResponse);
    }
  }
}

