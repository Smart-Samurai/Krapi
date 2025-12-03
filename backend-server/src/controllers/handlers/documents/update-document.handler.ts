import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for updating a document
 * PUT /krapi/k1/projects/:projectId/collections/:collectionName/documents/:documentId
 */
export class UpdateDocumentHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      const { projectId, collectionName, documentId } = req.params;
      if (!projectId || !collectionName || !documentId) {
        res.status(400).json({
          success: false,
          error: "Project ID, collection name, and document ID are required",
        });
        return;
      }
      const sanitizedId = sanitizeProjectId(projectId);
      const { data } = req.body;

      // Use SDK method to update document
      const document = await this.backendSDK.updateDocument(
        sanitizedId,
        collectionName,
        documentId,
        data
      );

      // SDK adapter expects response.data to be the Document
      res.status(200).json({
        success: true,
        data: document,
      });
    } catch (error) {
      console.error("Error updating document:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to update document",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}





