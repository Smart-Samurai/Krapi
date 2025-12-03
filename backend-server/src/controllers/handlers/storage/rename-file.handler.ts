import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for renaming a file
 * POST /krapi/k1/projects/:projectId/files/rename
 * 
 * Uses SDK storage.updateFile() method to change original_name (rename operation).
 */
export class RenameFileHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { fileId, newName } = req.body;

      if (!projectId || !fileId || !newName) {
        res.status(400).json({
          success: false,
          error: "Project ID, file ID, and new name are required",
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

      // Use SDK storage.updateFile() to rename file (change original_name)
      const renamedFile = await this.backendSDK.storage.updateFile(
        projectId,
        fileId,
        { original_name: newName },
        updatedBy
      );

      if (!renamedFile) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: renamedFile,
        message: "File renamed successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error renaming file:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to rename file",
      } as ApiResponse);
    }
  }
}

