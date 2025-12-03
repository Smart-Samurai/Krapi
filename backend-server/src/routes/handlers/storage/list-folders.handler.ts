import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for listing folders
 * GET /storage/folders
 */
export class ListFoldersHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const params = req.params as Record<string, string>;
      const projectId = params.projectId;

      if (!projectId) {
        res.status(400).json({ success: false, error: "Project ID is required" });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { parent_folder_id, include_files } = req.query;

      const folderOptions: {
        parentFolderId?: string;
        includeFiles?: boolean;
      } = {};

      if (parent_folder_id && typeof parent_folder_id === "string") {
        folderOptions.parentFolderId = parent_folder_id;
      }

      if (include_files === "true") {
        folderOptions.includeFiles = true;
      }

      // Type assertion needed as SDK types may not be fully updated
      const storageService = this.backendSDK.storage as unknown as {
        folders: {
          list: (
            projectId: string,
            options?: { parentFolderId?: string; includeFiles?: boolean }
          ) => Promise<
            Array<{
              id: string;
              name: string;
              parent_folder_id?: string;
              metadata?: Record<string, unknown>;
            }>
          >;
        };
      };

      const folders = await storageService.folders.list(projectId, folderOptions);

      res.status(200).json({ success: true, data: folders });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get folders",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      });
    }
  }
}

