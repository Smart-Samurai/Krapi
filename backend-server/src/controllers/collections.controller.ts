import { ApiResponse } from "@krapi/sdk";
import { Response } from "express";

import { DatabaseService } from "../services/database.service";
import { isValidProjectId, sanitizeProjectId } from "../utils/validation";

import { AuthenticatedRequest } from "@/types";

export class CollectionsController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Get all collections for a project
   * GET /krapi/k1/projects/:projectId/collections
   */
  getAllCollections = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId } = req.params;
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
          code: "MISSING_PROJECT_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      // Get collections from database
      const collections = await this.db.getProjectCollections(sanitizedId);

      res.status(200).json({
        success: true,
        data: collections || [],
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Get collections error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to fetch collections",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  /**
   * Get a specific collection by name
   * GET /krapi/k1/projects/:projectId/collections/:collectionName
   */
  getCollectionByName = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
          code: "MISSING_PROJECT_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      if (!collectionName) {
        res.status(400).json({
          success: false,
          error: "Collection name is required",
          code: "MISSING_COLLECTION_NAME",
        } as ApiResponse);
        return;
      }

      // Get collection from database
      const collection = await this.db.getCollectionByName(
        sanitizedId,
        collectionName
      );

      if (collection) {
        res.status(200).json({
          success: true,
          data: collection,
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Get collection error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to fetch collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  /**
   * Create a new collection
   * POST /krapi/k1/projects/:projectId/collections
   */
  createCollection = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { name, description, fields, indexes } = req.body;
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
          code: "MISSING_PROJECT_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: "Collection name is required and must be a non-empty string",
          code: "INVALID_NAME",
        } as ApiResponse);
        return;
      }

      if (name.trim().length > 100) {
        res.status(400).json({
          success: false,
          error: "Collection name must be 100 characters or less",
          code: "NAME_TOO_LONG",
        } as ApiResponse);
        return;
      }

      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        res.status(400).json({
          success: false,
          error: "Collection fields are required and must be a non-empty array",
          code: "INVALID_FIELDS",
        } as ApiResponse);
        return;
      }

      // Validate field data
      const fieldValidation = this.validateFieldData(fields);
      if (!fieldValidation.isValid) {
        res.status(400).json({
          success: false,
          error: "Field validation failed",
          details: fieldValidation.issues,
          code: "FIELD_VALIDATION_ERROR",
        } as ApiResponse);
        return;
      }

      // Validate indexes if provided
      if (indexes && Array.isArray(indexes) && indexes.length > 0) {
        const indexValidation = this.validateIndexData(indexes, fields);
        if (!indexValidation.isValid) {
          res.status(400).json({
            success: false,
            error: "Index validation failed",
            details: indexValidation.issues,
            code: "INDEX_VALIDATION_ERROR",
          } as ApiResponse);
          return;
        }
      }

      // Create collection using database service
      const collection = await this.db.createCollection(
        sanitizedId,
        name.trim(),
        {
          description: description?.trim() || undefined,
          fields,
          indexes: indexes || [],
        },
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: collection,
        message: `Collection created successfully`,
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Create collection error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to create collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  /**
   * Update a collection
   * PUT /krapi/k1/projects/:projectId/collections/:collectionName
   */
  updateCollection = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const updates = req.body;
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
          code: "MISSING_PROJECT_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      if (!collectionName) {
        res.status(400).json({
          success: false,
          error: "Collection name is required",
          code: "MISSING_COLLECTION_NAME",
        } as ApiResponse);
        return;
      }

      // Update collection using database service
      const collection = await this.db.updateCollection(
        sanitizedId,
        collectionName,
        updates
      );

      if (collection) {
        res.status(200).json({
          success: true,
          data: collection,
          message: `Collection updated successfully`,
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Update collection error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to update collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  /**
   * Delete a collection
   * DELETE /krapi/k1/projects/:projectId/collections/:collectionName
   */
  deleteCollection = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
          code: "MISSING_PROJECT_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      if (!collectionName) {
        res.status(400).json({
          success: false,
          error: "Collection name is required",
          code: "MISSING_COLLECTION_NAME",
        } as ApiResponse);
        return;
      }

      // Delete collection using database service
      const deleted = await this.db.deleteCollection(
        sanitizedId,
        collectionName
      );

      if (deleted) {
        res.status(200).json({
          success: true,
          message: `Collection deleted successfully`,
        } as ApiResponse);
      } else {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error("Delete collection error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to delete collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  /**
   * Get collection statistics
   * GET /krapi/k1/projects/:projectId/collections/:collectionName/statistics
   */
  getCollectionStatistics = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
          code: "MISSING_PROJECT_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      if (!collectionName) {
        res.status(400).json({
          success: false,
          error: "Collection name is required",
          code: "MISSING_COLLECTION_NAME",
        } as ApiResponse);
        return;
      }

      // Get the collection to get statistics for
      const collection = await this.db.getCollection(
        sanitizedId,
        collectionName
      );

      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
          code: "COLLECTION_NOT_FOUND",
        } as ApiResponse);
        return;
      }

      // For now, return mock statistics since the database service doesn't have this method yet
      // TODO: Implement actual statistics collection in DatabaseService
      const statistics = {
        total_documents: 0,
        total_size_bytes: 0,
        field_count: collection.fields?.length || 0,
        index_count: collection.indexes?.length || 0,
        created_at: collection.created_at,
        updated_at: collection.updated_at
      };

      res.status(200).json({
        success: true,
        data: statistics,
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Get collection statistics error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to get collection statistics",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  /**
   * Validate collection schema
   * POST /krapi/k1/projects/:projectId/collections/:collectionName/validate-schema
   */
  validateCollectionSchema = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = sanitizeProjectId(projectId);

      if (!sanitizedId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
          code: "MISSING_PROJECT_ID",
        } as ApiResponse);
        return;
      }

      if (!isValidProjectId(sanitizedId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID format",
          code: "INVALID_ID_FORMAT",
        } as ApiResponse);
        return;
      }

      if (!collectionName) {
        res.status(400).json({
          success: false,
          error: "Collection name is required",
          code: "MISSING_COLLECTION_NAME",
        } as ApiResponse);
        return;
      }

      // Get the collection to validate
      const collection = await this.db.getCollection(
        sanitizedId,
        collectionName
      );

      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      // Basic schema validation
      const issues: string[] = [];
      let isValid = true;

      // Validate fields
      if (collection.fields && Array.isArray(collection.fields)) {
        collection.fields.forEach((field, index) => {
          if (!field.name || field.name.trim() === "") {
            issues.push(`Field ${index}: Name is required`);
            isValid = false;
          }

          if (
            !field.type ||
            ![
              "string",
              "text",
              "integer",
              "decimal",
              "boolean",
              "date",
              "timestamp",
              "json",
              "uuid",
            ].includes(field.type)
          ) {
            issues.push(`Field ${field.name}: Invalid type '${field.type}'`);
            isValid = false;
          }
        });
      }

      // Validate indexes
      if (collection.indexes && Array.isArray(collection.indexes)) {
        collection.indexes.forEach((index, indexIndex) => {
          if (!index.name || index.name.trim() === "") {
            issues.push(`Index ${indexIndex}: Name is required`);
            isValid = false;
          }

          if (
            !index.fields ||
            !Array.isArray(index.fields) ||
            index.fields.length === 0
          ) {
            issues.push(`Index ${index.name}: Must have at least one field`);
            isValid = false;
          }
        });
      }

      res.status(200).json({
        success: true,
        valid: isValid,
        issues,
        collectionName,
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Schema validation error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      res.status(500).json({
        success: false,
        error: "Failed to validate schema",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: "INTERNAL_ERROR",
      } as ApiResponse);
      return;
    }
  };

  /**
   * Validate field data for collection creation/update
   */
  private validateFieldData(fields: Record<string, unknown>[]): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    let isValid = true;

    if (!Array.isArray(fields)) {
      return { isValid: false, issues: ["Fields must be an array"] };
    }

    fields.forEach((field, index) => {
      if (!field.name || typeof field.name !== "string" || field.name.trim() === "") {
        issues.push(`Field ${index}: Name is required and cannot be empty`);
        isValid = false;
      }

      // Check for invalid field names (spaces, special characters)
      if (field.name && typeof field.name === "string" && /[^a-zA-Z0-9_]/g.test(field.name)) {
        issues.push(`Field ${field.name}: Name cannot contain spaces or special characters (only letters, numbers, and underscores allowed)`);
        isValid = false;
      }

      if (!field.type || typeof field.type !== "string") {
        issues.push(`Field ${field.name || index}: Type is required`);
        isValid = false;
      }

      const validTypes = [
        "string",
        "text",
        "integer",
        "decimal",
        "boolean",
        "date",
        "timestamp",
        "json",
        "uuid",
      ];

      if (field.type && typeof field.type === "string" && !validTypes.includes(field.type)) {
        issues.push(`Field ${field.name}: Invalid type '${field.type}'. Valid types are: ${validTypes.join(", ")}`);
        isValid = false;
      }
    });

    return { isValid, issues };
  }

  /**
   * Validate index data for collection creation/update
   */
  private validateIndexData(indexes: Record<string, unknown>[], fields: Record<string, unknown>[]): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    let isValid = true;

    if (!Array.isArray(indexes)) {
      return { isValid: false, issues: ["Indexes must be an array"] };
    }

    const fieldNames = fields.map(f => String(f.name || '')).filter(name => name.length > 0);

    indexes.forEach((index, indexIndex) => {
      if (!index.name || typeof index.name !== "string" || index.name.trim() === "") {
        issues.push(`Index ${indexIndex}: Name is required and cannot be empty`);
        isValid = false;
      }

      if (!index.fields || !Array.isArray(index.fields) || index.fields.length === 0) {
        issues.push(`Index ${index.name}: Must have at least one field`);
        isValid = false;
      }

      // Check if index fields exist in the collection
      (index.fields as string[]).forEach((fieldName: string) => {
        if (!fieldNames.includes(fieldName)) {
          issues.push(`Index ${index.name}: Field '${fieldName}' does not exist in the collection`);
          isValid = false;
        }
      });
    });

    return { isValid, issues };
  }
}
