import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "./collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for deleting a collection
 * DELETE /krapi/k1/projects/:projectId/collections/:collectionName
 */
export class DeleteCollectionHandler {
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

      // Use SDK method to delete collection
      const success = await this.backendSDK.deleteCollection(
        sanitizedId,
        collectionName
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Collection deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting collection:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to delete collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}








