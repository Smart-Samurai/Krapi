import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, AuthenticatedRequest } from "@/types";

/**
 * Handler for bulk updating file metadata
 * PUT /krapi/k1/projects/:projectId/files/bulk/metadata
 * 
 * Uses SDK storage.updateFile() method in a loop for bulk metadata updates.
 */
export class BulkUpdateFileMetadataHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { updates } = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({
          success: false,
          error: "Updates array is required",
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

      // Use SDK storage.updateFile() for each file update
      let updatedCount = 0;
      const errors: string[] = [];

      for (const update of updates) {
        try {
          const { fileId, ...metadataUpdates } = update;
          
          if (!fileId) {
            errors.push("Missing fileId in update");
            continue;
          }

          // Map update fields to SDK format
          const sdkUpdates: {
            original_name?: string;
            folder_id?: string;
            tags?: string[];
            metadata?: Record<string, unknown>;
            is_public?: boolean;
          } = {};

          if (metadataUpdates.original_name) sdkUpdates.original_name = metadataUpdates.original_name;
          if (metadataUpdates.folder_id) sdkUpdates.folder_id = metadataUpdates.folder_id;
          if (metadataUpdates.tags) sdkUpdates.tags = Array.isArray(metadataUpdates.tags) ? metadataUpdates.tags : [metadataUpdates.tags];
          if (metadataUpdates.metadata) sdkUpdates.metadata = typeof metadataUpdates.metadata === 'string' ? JSON.parse(metadataUpdates.metadata) : metadataUpdates.metadata;
          if (metadataUpdates.is_public !== undefined) sdkUpdates.is_public = metadataUpdates.is_public === true || metadataUpdates.is_public === 'true';

          const updated = await this.backendSDK.storage.updateFile(
            projectId,
            fileId,
            sdkUpdates,
            updatedBy
          );
          if (updated) updatedCount++;
        } catch (error) {
          errors.push(`Failed to update file ${update.fileId}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      res.json({
        success: true,
        data: {
          updated: updatedCount,
          failed: updates.length - updatedCount,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `${updatedCount} files updated successfully`,
      } as ApiResponse);
    } catch (error) {
      console.error("Error bulk updating file metadata:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to bulk update file metadata",
      } as ApiResponse);
    }
  }
}

