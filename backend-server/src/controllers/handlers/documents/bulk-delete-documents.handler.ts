import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for bulk deleting documents
 * DELETE /krapi/k1/projects/:projectId/collections/:collectionName/documents/bulk
 */
export class BulkDeleteDocumentsHandler {
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
      const { document_ids: documentIds } = req.body;

      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: "Document IDs array is required and must not be empty",
        });
        return;
      }

      // Use SDK method to delete documents (bulk method)
      // SDK's deleteDocuments implementation returns boolean[] (array of booleans)
      // But TypeScript definition says it returns { success, results, deleted_count, errors }
      // Handle both cases for compatibility
      const deleteResult = await this.backendSDK.deleteDocuments(
        sanitizedId,
        collectionName,
        documentIds
      );

      // SDK implementation returns boolean[], but TypeScript says it returns an object
      // Check runtime type and handle accordingly
      let deleteResults: boolean[];
      let deletedCount: number;
      let errors: string[] = [];
      
      if (Array.isArray(deleteResult)) {
        // Runtime returns boolean[] (actual implementation)
        deleteResults = deleteResult;
        deletedCount = deleteResults.filter((result) => result === true).length;
        deleteResults.forEach((result, index) => {
          if (result !== true) {
            errors.push(`Failed to delete document ${documentIds[index]}`);
          }
        });
      } else if (deleteResult && typeof deleteResult === "object" && "results" in deleteResult) {
        // TypeScript definition says it returns an object (future-proof)
        const resultObj = deleteResult as { results: boolean[]; deleted_count?: number; errors?: string[] };
        deleteResults = resultObj.results;
        deletedCount = resultObj.deleted_count ?? deleteResults.filter((result) => result === true).length;
        errors = resultObj.errors ?? [];
        // Fill in missing errors from results array
        if (errors.length === 0) {
          deleteResults.forEach((result, index) => {
            if (result !== true) {
              errors.push(`Failed to delete document ${documentIds[index]}`);
            }
          });
        }
      } else {
        console.error("[BULK DELETE HANDLER] Unexpected deleteResult type:", typeof deleteResult, deleteResult);
        throw new Error("SDK deleteDocuments returned unexpected result type");
      }

      // SDK returns array of booleans, format response to match expected structure
      // HTTP client expects { success: true, data: { deleted_count, errors } }
      const response = {
        success: true,
        data: {
          deleted_count: deletedCount,
          errors: errors.length > 0 ? errors : [],
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error bulk deleting documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to bulk delete documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}

