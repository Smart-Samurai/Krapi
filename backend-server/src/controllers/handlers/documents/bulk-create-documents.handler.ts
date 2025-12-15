import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for bulk creating documents
 * POST /krapi/k1/projects/:projectId/collections/:collectionName/documents/bulk
 */
export class BulkCreateDocumentsHandler {
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
      const { documents } = req.body;

      if (!Array.isArray(documents) || documents.length === 0) {
        res.status(400).json({
          success: false,
          error: "Documents array is required and must not be empty",
        });
        return;
      }

      // Set current user ID for SDK operations
      this.backendSDK.setCurrentUserId(req.user?.id || "system");

      // Convert documents to CreateDocumentRequest format
      const documentRequests = documents.map(
        (doc: Record<string, unknown>) => ({
          data: (doc as { data: unknown }).data || doc, // Extract the data property from the document
          created_by: req.user?.id || "system",
        })
      );

      // Use SDK method to create documents individually (bulk)
      const createdDocuments = [];
      for (const docRequest of documentRequests) {
        try {
          const created = await this.backendSDK.createDocument(
            sanitizedId,
            collectionName,
            docRequest.data as Record<string, unknown>
          );
          createdDocuments.push(created);
        } catch (error) {
          console.error("Error creating document:", error);
          // Continue with other documents
        }
      }

      res.status(201).json({
        success: true,
        created: createdDocuments,
        errors: [],
        total: createdDocuments.length,
      });
    } catch (error) {
      console.error("Error bulk creating documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to bulk create documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}

