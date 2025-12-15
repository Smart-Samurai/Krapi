import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for removing tags from a file
 * DELETE /krapi/k1/projects/:projectId/files/:fileId/tags
 * 
 * Uses SDK storage.updateFile() method to remove tags from existing file tags.
 */
export class RemoveFileTagsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, fileId } = req.params;
      const { tags } = req.body;

      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        } as ApiResponse);
        return;
      }

      if (!Array.isArray(tags) || tags.length === 0) {
        res.status(400).json({
          success: false,
          error: "Tags array is required",
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

      // Get current file to remove tags
      const currentFile = await this.backendSDK.storage.getFileById(projectId, fileId);
      if (!currentFile) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      // Remove specified tags from existing tags
      const existingTags = currentFile.tags || [];
      const updatedTags = existingTags.filter(tag => !tags.includes(tag));

      const authReq = req as AuthenticatedRequest;
      const updatedBy = authReq.user?.id || authReq.session?.user_id || "system";

      // Use SDK storage.updateFile() to update tags
      const updatedFile = await this.backendSDK.storage.updateFile(
        projectId,
        fileId,
        { tags: updatedTags },
        updatedBy
      );

      res.json({
        success: true,
        data: updatedFile,
        message: "Tags removed successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error removing file tags:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to remove file tags",
      } as ApiResponse);
    }
  }
}

