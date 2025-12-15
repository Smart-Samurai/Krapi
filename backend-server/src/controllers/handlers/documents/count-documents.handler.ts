import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for counting documents
 * GET /krapi/k1/projects/:projectId/collections/:collectionName/documents/count
 */
export class CountDocumentsHandler {
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
      
      // Support both GET (query) and POST (body) requests
      const filter = req.method === "POST" ? req.body?.filter : req.query.filter;

      // Parse filter parameters
      let documentFilter: Record<string, unknown> | undefined = undefined;
      if (filter && typeof filter === "object") {
        documentFilter = filter as Record<string, unknown>;
      }

      const count = await this.backendSDK.countDocuments(
        sanitizedId,
        collectionName,
        documentFilter
      );

      const countValue =
        typeof count === "number" 
          ? count 
          : (typeof count === "object" && count !== null && "count" in count)
            ? (count as { count: number }).count
            : 0;

      // SDK adapter expects response.data to be { count: number }
      res.status(200).json({
        success: true,
        data: { count: countValue },
      });
    } catch (error) {
      console.error("Error counting documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to count documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}





