import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "./collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for validating a collection schema
 * POST /krapi/k1/projects/:projectId/collections/:collectionName/validate
 */
export class ValidateCollectionSchemaHandler {
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

      // Get collection from SDK to validate it exists
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

      // Validate schema structure
      const validationErrors: string[] = [];

      if (!collection.fields || collection.fields.length === 0) {
        validationErrors.push("Collection must have at least one field");
      }

      collection.fields?.forEach((field, index) => {
        if (!field.name) {
          validationErrors.push(`Field ${index + 1} must have a name`);
        }
        if (!field.type) {
          validationErrors.push(`Field "${field.name}" must have a type`);
        }
      });

      // SDK expects: { valid: boolean, issues: Array<{type, field?, message, severity}> }
      if (validationErrors.length > 0) {
        res.status(200).json({
          success: true,
          data: {
            valid: false,
            issues: validationErrors.map((error) => ({
              type: "validation_error",
              message: error,
              severity: "error" as const,
            })),
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          issues: [],
        },
      });
    } catch (error) {
      console.error("Error validating collection schema:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to validate collection schema",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}





