import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for listing files
 * GET /storage/files
 */
export class ListFilesHandler {
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

      // Use SDK storage.getFiles() method (server mode)
      // Extract query parameters for filtering/pagination
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const folder = req.query.folder_id ? String(req.query.folder_id) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const mimeType = req.query.mime_type ? String(req.query.mime_type) : undefined;

      const options: {
        folder?: string;
        limit?: number;
        offset?: number;
        search?: string;
        type?: string;
      } = {};

      if (folder) options.folder = folder;
      if (limit !== undefined) options.limit = limit;
      if (offset !== undefined) options.offset = offset;
      if (search) options.search = search;
      if (mimeType) options.type = mimeType;

      // Use SDK storage.getAllFiles() method (server mode)
      // BackendSDK uses getAllFiles, not getFiles
      const getAllFilesOptions: {
        limit?: number;
        offset?: number;
        include_deleted?: boolean;
      } = {
        include_deleted: false,
      };
      if (options.limit !== undefined) {
        getAllFilesOptions.limit = options.limit;
      }
      if (options.offset !== undefined) {
        getAllFilesOptions.offset = options.offset;
      }
      const files = await this.backendSDK.storage.getAllFiles(projectId, getAllFilesOptions);
      
      // Filter by folder, search, and mime_type if provided (SDK doesn't support these in getAllFiles)
      let result = files;
      if (options.folder) {
        result = result.filter((file: { folder_id?: string }) => file.folder_id === options.folder);
      }
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        result = result.filter((file: { filename?: string; original_name?: string }) => 
          (file.filename?.toLowerCase().includes(searchLower) || 
           file.original_name?.toLowerCase().includes(searchLower))
        );
      }
      if (options.type) {
        result = result.filter((file: { mime_type?: string }) => file.mime_type === options.type);
      }

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get files",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      });
    }
  }
}

