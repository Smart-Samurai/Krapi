import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for updating file metadata
 * PUT /krapi/k1/projects/:projectId/files/:fileId/metadata
 */
export class UpdateFileMetadataHandler {
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
      const metadata = req.body;

      if (!projectId || !fileId) {
        res.status(400).json({
          success: false,
          error: "Project ID and file ID are required",
        } as ApiResponse);
        return;
      }

      if (!metadata || Object.keys(metadata).length === 0) {
        res.status(400).json({
          success: false,
          error: "Metadata is required",
        } as ApiResponse);
        return;
      }

      // Use SDK storage.updateFile() method for updating file metadata
      const updatedBy = (req as AuthenticatedRequest).user?.id || 
                       (req as AuthenticatedRequest).session?.user_id || 
                       "system";
      
      const updates: {
        original_name?: string;
        folder_id?: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
        is_public?: boolean;
      } = {};

      // Map request body to SDK update format
      if (metadata.original_name) updates.original_name = metadata.original_name;
      if (metadata.folder_id) updates.folder_id = metadata.folder_id;
      if (metadata.tags) updates.tags = metadata.tags;
      if (metadata.metadata) updates.metadata = metadata.metadata;
      if (metadata.is_public !== undefined) updates.is_public = metadata.is_public;

      const updatedFile = await this.backendSDK.storage.updateFile(
        projectId,
        fileId,
        updates,
        updatedBy
      );

      res.json({
        success: true,
        data: updatedFile,
        message: "File metadata updated successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error updating file metadata:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update file metadata",
      } as ApiResponse);
    }
  }
}

