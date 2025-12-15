import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for getting documents
 * GET /krapi/k1/projects/:projectId/collections/:collectionName/documents
 */
export class GetDocumentsHandler {
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

      // Extract query parameters for pagination and filtering
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const orderBy = req.query.orderBy as string | undefined;
      const order = req.query.order as "asc" | "desc" | undefined;
      const search = req.query.search as string | undefined;

      // Build options object for SDK
      const options: {
        limit?: number;
        offset?: number;
        page?: number;
        orderBy?: string;
        order?: "asc" | "desc";
        search?: string;
      } = {};
      if (limit !== undefined) options.limit = limit;
      if (offset !== undefined) options.offset = offset;
      if (page !== undefined) options.page = page;
      if (orderBy !== undefined) options.orderBy = orderBy;
      if (order !== undefined) options.order = order;
      if (search !== undefined) options.search = search;

      // Use SDK method to get documents with options
      let documents = await this.backendSDK.getDocuments(sanitizedId, collectionName, options);

      // Apply limit manually if SDK doesn't respect it
      if (Array.isArray(documents) && limit !== undefined) {
        const startIndex = offset !== undefined ? offset : (page !== undefined ? (page - 1) * limit : 0);
        documents = documents.slice(startIndex, startIndex + limit);
      }

      res.status(200).json({
        success: true,
        documents,
        total: Array.isArray(documents) ? documents.length : 0,
        data: documents,
      });
    } catch (error) {
      console.error("Error getting documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}


