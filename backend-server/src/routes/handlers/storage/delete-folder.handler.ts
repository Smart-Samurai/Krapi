import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for deleting a folder
 * DELETE /storage/folders/:folderId
 */
export class DeleteFolderHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const params = req.params as Record<string, string>;
      const projectId = params.projectId;
      const folderId = params.folderId;

      if (!projectId || !folderId) {
        res.status(400).json({
          success: false,
          error: "Project ID and folder ID are required",
        });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      // Type assertion needed as SDK types may not be fully updated
      const storageService = this.backendSDK.storage as unknown as {
        folders: {
          delete: (projectId: string, folderId: string) => Promise<void>;
        };
      };

      await storageService.folders.delete(projectId, folderId);

      res.status(200).json({ success: true, message: "Folder deleted successfully" });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to delete folder",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      });
    }
  }
}

