import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for adding tags to a file
 * POST /krapi/k1/projects/:projectId/files/:fileId/tags
 * 
 * Uses SDK storage.updateFile() method to add tags to existing file tags.
 */
export class AddFileTagsHandler {
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

      // Get current file to merge tags
      const currentFile = await this.backendSDK.storage.getFileById(projectId, fileId);
      if (!currentFile) {
        res.status(404).json({
          success: false,
          error: "File not found",
        } as ApiResponse);
        return;
      }

      // Merge new tags with existing tags (avoid duplicates)
      const existingTags = currentFile.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])];

      const authReq = req as AuthenticatedRequest;
      const updatedBy = authReq.user?.id || authReq.session?.user_id || "system";

      // Use SDK storage.updateFile() to update tags
      const updatedFile = await this.backendSDK.storage.updateFile(
        projectId,
        fileId,
        { tags: newTags },
        updatedBy
      );

      res.json({
        success: true,
        data: updatedFile,
        message: "Tags added successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error adding file tags:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to add file tags",
      } as ApiResponse);
    }
  }
}

