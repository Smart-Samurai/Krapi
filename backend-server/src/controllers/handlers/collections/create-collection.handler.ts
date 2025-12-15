import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId, extractProjectId } from "./collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for creating a new collection
 * POST /krapi/k1/projects/:projectId/collections
 */
export class CreateCollectionHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      const projectId = extractProjectId(req);
      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      const sanitizedId = sanitizeProjectId(projectId);
      const { name, fields, description, indexes } = req.body;

      console.log("🔍 [COLLECTIONS DEBUG] Creating collection with data:", {
        projectId: sanitizedId,
        name,
        fieldsCount: fields?.length,
        fields,
        description,
        indexes,
      });

      // Validate collection data before creating
      const validationErrors = [];

      // Check for empty or invalid field names
      if (!fields || !Array.isArray(fields)) {
        validationErrors.push("Fields must be an array");
      } else {
        fields.forEach((field, index) => {
          if (!field.name || field.name.trim() === "") {
            validationErrors.push(`Field ${index + 1} must have a name`);
          } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
            validationErrors.push(
              `Field name "${field.name}" must contain only letters, numbers, and underscores, and cannot start with a number`
            );
          }
          if (!field.type) {
            validationErrors.push(`Field "${field.name}" must have a type`);
          }
        });
      }

      // Check for empty collection name
      if (!name || name.trim() === "") {
        validationErrors.push("Collection name is required");
      } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
        validationErrors.push(
          `Collection name "${name}" must start with a letter and contain only letters, numbers, and underscores`
        );
      }

      // If there are validation errors, return them
      if (validationErrors.length > 0) {
        console.error("❌ [COLLECTIONS DEBUG] Validation errors:", validationErrors);
        res.status(400).json({
          success: false,
          error: "Validation failed",
          issues: validationErrors,
        });
        return;
      }

      // Check if collection with same name already exists in this project
      const existingCollections = await this.backendSDK.getProjectCollections(
        sanitizedId
      );
      const duplicateCollection = existingCollections.find(
        (collection: { name: string }) => collection.name === name
      );

      if (duplicateCollection) {
        res.status(400).json({
          success: false,
          error: "Collection with this name already exists",
          issues: [`Collection "${name}" already exists in this project`],
        });
        return;
      }

      // Use SDK method to create collection
      const collection = await this.backendSDK.createCollection(
        sanitizedId,
        name,
        {
          description,
          fields,
          indexes,
        },
        req.user?.id || "system"
      );

      res.status(201).json({
        success: true,
        collection,
      });
    } catch (error) {
      console.error("Error creating collection:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to create collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}








