import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthenticatedRequest } from "@/types";

/**
 * Handler for creating a folder
 * POST /storage/folders
 */
export class CreateFolderHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const params = req.params as Record<string, string>;
      const projectId = params.projectId;

      if (!projectId) {
        res.status(400).json({ success: false, error: "Project ID is required" });
        return;
      }

      const { name, parent_folder_id } = req.body;
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      if (!name) {
        res.status(400).json({ success: false, error: "Folder name is required" });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      // Type assertion needed as SDK types may not be fully updated
      const storageService = this.backendSDK.storage as unknown as {
        folders: {
          create: (
            projectId: string,
            data: {
              name: string;
              parent_folder_id?: string;
            }
          ) => Promise<{
            id: string;
            name: string;
            parent_folder_id?: string;
            metadata?: Record<string, unknown>;
          }>;
        };
      };

      const folder = await storageService.folders.create(projectId, {
        name,
        parent_folder_id: parent_folder_id || undefined,
      });

      res.status(201).json({ success: true, data: folder });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to create folder",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      });
    }
  }
}

