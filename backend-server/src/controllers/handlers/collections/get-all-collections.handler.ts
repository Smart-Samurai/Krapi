import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for getting all collections for a project
 * GET /krapi/k1/projects/:projectId/collections
 */
export class GetAllCollectionsHandler {
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
      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }
      const sanitizedId = this.sanitizeProjectId(projectId);

      const collections = await this.backendSDK.getProjectCollections(
        sanitizedId
      );

      res.status(200).json({
        success: true,
        collections,
        data: collections,
      });
    } catch (error) {
      console.error("Get all collections error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get collections",
      });
    }
  }
}








