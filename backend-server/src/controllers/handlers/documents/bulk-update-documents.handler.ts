import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for bulk updating documents
 * PUT /krapi/k1/projects/:projectId/collections/:collectionName/documents/bulk
 */
export class BulkUpdateDocumentsHandler {
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
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({
          success: false,
          error: "Updates array is required and must not be empty",
        });
        return;
      }

      // Normalize updates array to ensure data is properly formatted
      // Fix for issue where data might be stringified or spread character-by-character
      const normalizedUpdates = Array.isArray(updates)
        ? updates.map((update: unknown) => {
            if (!update || typeof update !== "object") {
              throw new Error("Invalid update format: update must be an object");
            }

            const updateObj = update as { id?: unknown; data?: unknown };
            
            if (!updateObj.id || typeof updateObj.id !== "string") {
              throw new Error("Invalid update format: id must be a string");
            }

            // Ensure data is a proper object, not a string or spread string
            let data = updateObj.data;
            
            // If data is a string, try to parse it
            if (typeof data === "string") {
              try {
                data = JSON.parse(data);
              } catch {
                throw new Error("Invalid update format: data is not valid JSON");
              }
            }

            // If data has been spread character-by-character (has numeric string keys),
            // it means it was incorrectly stringified and spread. We need to reconstruct it.
            if (data && typeof data === "object" && !Array.isArray(data)) {
              const dataObj = data as Record<string, unknown>;
              const hasNumericKeys = Object.keys(dataObj).some(
                (key) => /^\d+$/.test(key) && typeof dataObj[key] === "string"
              );
              
              // If we detect character-by-character spread, try to reconstruct from the actual properties
              // by removing numeric keys and keeping only the real properties
              if (hasNumericKeys) {
                const cleanedData: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(dataObj)) {
                  // Skip numeric keys (character indices) and keep only real property names
                  if (!/^\d+$/.test(key)) {
                    cleanedData[key] = value;
                  }
                }
                data = cleanedData;
              }
            }

            // Ensure data is an object
            if (!data || typeof data !== "object" || Array.isArray(data)) {
              throw new Error("Invalid update format: data must be an object");
            }

            return {
              id: updateObj.id,
              data: data as Record<string, unknown>,
            };
          })
        : [];

      // Use SDK method to update documents (bulk method)
      const updatedDocuments = await this.backendSDK.updateDocuments(
        sanitizedId,
        collectionName,
        normalizedUpdates
      );

      res.status(200).json({
        success: true,
        updated: updatedDocuments,
        errors: [],
        total: updatedDocuments.length,
      });
    } catch (error) {
      console.error("Error bulk updating documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to bulk update documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}

