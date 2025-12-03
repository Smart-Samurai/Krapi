import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for searching documents
 * POST /krapi/k1/projects/:projectId/collections/:collectionName/documents/search
 */
export class SearchDocumentsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      const { projectId, collectionName } = req.params;
      if (!projectId || !collectionName) {
        res.status(400).json({
          success: false,
          error: "Project ID and collection name are required",
        });
        return;
      }
      const sanitizedId = sanitizeProjectId(projectId);
      
      // Support both formats: { query: "text" } and { text: "text" }
      const searchQuery = req.body.query || req.body.text;
      const limit = req.body.limit || 100;
      const offset = req.body.offset || 0;
      const fields = req.body.fields;
      const filters = req.body.filters;

      // Validate search query - text is optional if filters are provided
      if (
        (!searchQuery || typeof searchQuery !== "string" || searchQuery.trim() === "") &&
        !filters
      ) {
        res.status(400).json({
          success: false,
          error: "Search query (text) or filters are required",
        });
        return;
      }

      // Use SDK method to search documents
      const documents = await this.backendSDK.searchDocuments(
        sanitizedId,
        collectionName,
        {
          text: searchQuery,
          fields,
          filters,
          limit: Number(limit),
          offset: Number(offset),
        }
      );

      // SDK adapter expects response.data to be the search results
      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      console.error("Error searching documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to search documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}

