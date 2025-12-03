import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "./collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for getting collection statistics
 * GET /krapi/k1/projects/:projectId/collections/:collectionName/statistics
 */
export class GetCollectionStatisticsHandler {
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

      // Get collection info from SDK
      const collection = await this.backendSDK.getCollection(
        sanitizedId,
        collectionName
      );

      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        });
        return;
      }

      // Get document count (if available)
      let totalDocuments = 0;
      try {
        const documents = await this.backendSDK.getDocuments(
          sanitizedId,
          collectionName,
          {}
        );
        totalDocuments = Array.isArray(documents) ? documents.length : 0;
      } catch {
        // If document count fails, use 0
      }

      // Return the structure the frontend expects
      res.status(200).json({
        success: true,
        data: {
          total_documents: totalDocuments,
          total_size_bytes: 0, // Will be implemented when document operations are available
          collectionId: collection.id,
          name: collection.name,
          fieldCount: collection.fields?.length || 0,
          createdAt: collection.created_at,
          updatedAt: collection.updated_at,
        },
      });
    } catch (error) {
      console.error("Error getting collection statistics:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get collection statistics",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}


