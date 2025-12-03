import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for getting a collection by name
 * GET /krapi/k1/projects/:projectId/collections/:collectionName
 */
export class GetCollectionByNameHandler {
  constructor(private backendSDK: BackendSDK) {}

  private sanitizeProjectId(projectId: string): string {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(projectId)
      ? projectId
      : projectId.replace(/[^a-zA-Z0-9_-]/g, "");
  }

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
      const sanitizedId = this.sanitizeProjectId(projectId);

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

      res.status(200).json({
        success: true,
        collection,
        data: collection,
      });
    } catch (error) {
      console.error("Get collection by name error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get collection",
      });
    }
  }
}








