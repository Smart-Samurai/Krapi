import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "./collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for updating a collection
 * PUT /krapi/k1/projects/:projectId/collections/:collectionName
 */
export class UpdateCollectionHandler {
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
      const { description, fields, indexes } = req.body;

      // Use SDK method to update collection
      const updatedCollection = await this.backendSDK.updateCollection(
        sanitizedId,
        collectionName,
        {
          description,
          fields,
          indexes,
        }
      );

      res.status(200).json({
        success: true,
        collection: updatedCollection,
      });
    } catch (error) {
      console.error("Error updating collection:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to update collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}








