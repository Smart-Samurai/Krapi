import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for deleting a document
 * DELETE /krapi/k1/projects/:projectId/collections/:collectionName/documents/:documentId
 */
export class DeleteDocumentHandler {
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

      // Use SDK method to delete document
      const success = await this.backendSDK.deleteDocument(
        sanitizedId,
        collectionName,
        documentId
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: "Document not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to delete document",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}








