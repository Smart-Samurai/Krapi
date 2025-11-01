import { BackendSDK } from "@krapi/sdk";
import { Response } from "express";
import type { Request as ExpressRequest } from "express";

import { AuthenticatedRequest } from "@/types";

// Extend the AuthenticatedRequest interface to include app.locals.backendSDK
// Explicitly include all Express Request properties to ensure TypeScript recognition
type ExtendedRequest = ExpressRequest &
  AuthenticatedRequest & {
    // Explicitly redeclare Express Request properties that TypeScript needs
    params: ExpressRequest["params"];
    body: ExpressRequest["body"];
    query: ExpressRequest["query"];
    originalUrl: ExpressRequest["originalUrl"];
    // Override app to add backendSDK to locals
    app: ExpressRequest["app"] & {
      locals: ExpressRequest["app"]["locals"] & {
        backendSDK?: BackendSDK;
      };
    };
  };

export class CollectionsController {
  private backendSDK?: BackendSDK;

  setBackendSDK(sdk: BackendSDK) {
    this.backendSDK = sdk;
  }

  /**
   * Sanitize project ID while preserving UUID format (with dashes)
   */
  private sanitizeProjectId(projectId: string): string {
    // Preserve UUID format (with dashes) - only sanitize non-UUID IDs
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(projectId)
      ? projectId // Keep UUIDs as-is (with dashes)
      : projectId.replace(/[^a-zA-Z0-9_-]/g, ""); // For non-UUIDs, allow dashes and underscores
  }

  /**
   * Get all collections for a project
   */
  async getAllCollections(req: ExtendedRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Use SDK method to get collections
      const collections = await this.backendSDK.getProjectCollections(
        sanitizedId
      );

      res.status(200).json({
        success: true,
        collections,
      });
    } catch (error) {
      console.error("Error getting collections:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get collections",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }

  /**
   * Get a specific collection by name
   */
  async getCollectionByName(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Use SDK method to get collection
      const collection = await this.backendSDK.getCollection(
        sanitizedId,
        collectionName
      );

      if (!collection) {
        return res.status(404).json({
          success: false,
          error: "Collection not found",
        });
      }

      res.status(200).json({
        success: true,
        collection,
      });
    } catch (error) {
      console.error("Error getting collection:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(req: ExtendedRequest, res: Response) {
    try {
      let projectId = req.params.projectId;

      // If projectId is not in params, extract it from the URL path
      if (!projectId) {
        const urlParts = req.originalUrl?.split("/") || [];
        const projectIndex = urlParts.findIndex((part) => part === "projects");
        if (projectIndex !== -1 && projectIndex + 1 < urlParts.length) {
          projectId = urlParts[projectIndex + 1];
        }
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
      }

      const sanitizedId = this.sanitizeProjectId(projectId);
      const { name, fields, description, indexes } = req.body;

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
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          issues: validationErrors,
        });
      }

      // Check if collection with same name already exists in this project
      const existingCollections = await this.backendSDK.getProjectCollections(
        sanitizedId
      );
      const duplicateCollection = existingCollections.find(
        (collection) => collection.name === name
      );

      if (duplicateCollection) {
        return res.status(400).json({
          success: false,
          error: "Collection with this name already exists",
          issues: [`Collection "${name}" already exists in this project`],
        });
      }

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
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
        req.user.id
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

  /**
   * Update an existing collection
   */
  async updateCollection(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const { description, fields, indexes } = req.body;
      const sanitizedId = this.sanitizeProjectId(projectId);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Use SDK method to update collection
      const updatedCollection = await this.backendSDK.updateCollection(
        sanitizedId,
        collectionName,
        {
          description,
          fields,
          indexes,
        }
      );

      res.status(200).json({
        success: true,
        collection: updatedCollection,
      });
    } catch (error) {
      console.error("Error updating collection:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to update collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Use SDK method to delete collection
      const success = await this.backendSDK.deleteCollection(
        sanitizedId,
        collectionName
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Collection not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Collection deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting collection:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to delete collection",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStatistics(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Get collection info from SDK
      const collection = await this.backendSDK.getCollection(
        sanitizedId,
        collectionName
      );

      if (!collection) {
        return res.status(404).json({
          success: false,
          error: "Collection not found",
        });
      }

      // Return the structure the frontend expects
      res.status(200).json({
        success: true,
        data: {
          total_documents: 0, // Will be implemented when document operations are available
          total_size_bytes: 0, // Will be implemented when document operations are available
          collectionId: collection.id,
          name: collection.name,
          fieldCount: collection.fields?.length || 0,
          createdAt: collection.created_at,
          updatedAt: collection.updated_at,
        },
      });
    } catch (error) {
      console.error("Error getting collection statistics:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get collection statistics",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }

  /**
   * Validate a collection schema
   */
  async validateCollectionSchema(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Get collection from SDK to validate it exists
      const collection = await this.backendSDK.getCollection(
        sanitizedId,
        collectionName
      );

      if (!collection) {
        return res.status(404).json({
          success: false,
          error: "Collection not found",
        });
      }

      // Implement proper schema validation
      const validationResult = {
        isValid: true,
        issues: [] as string[],
        warnings: [] as string[],
        suggestions: [] as string[],
      };

      // Validate collection fields
      if (collection.fields && Array.isArray(collection.fields)) {
        for (const field of collection.fields) {
          if (!field.name || field.name.trim() === "") {
            validationResult.issues.push(`Field must have a name`);
            validationResult.isValid = false;
          }
          if (!field.type) {
            validationResult.issues.push(
              `Field "${field.name}" must have a type`
            );
            validationResult.isValid = false;
          }
          if (field.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
            validationResult.issues.push(
              `Field name "${field.name}" must contain only letters, numbers, and underscores, and cannot start with a number`
            );
            validationResult.isValid = false;
          }
        }
      }

      // Validate collection name
      if (!collection.name || collection.name.trim() === "") {
        validationResult.issues.push("Collection name is required");
        validationResult.isValid = false;
      } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(collection.name)) {
        validationResult.issues.push(
          `Collection name "${collection.name}" must start with a letter and contain only letters, numbers, and underscores`
        );
        validationResult.isValid = false;
      }

      res.status(200).json({
        success: true,
        valid: validationResult.isValid,
        issues: validationResult.issues,
        warnings: validationResult.warnings,
        suggestions: validationResult.suggestions,
        collection: {
          id: collection.id,
          name: collection.name,
          fields: collection.fields,
          description: collection.description,
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

  /**
   * Create a new document in a collection
   */
  async createDocument(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);
      const { data } = req.body;

      console.log(
        `🔍 [DOCUMENT DEBUG] Creating document in project ${sanitizedId}, collection ${collectionName}`
      );
      console.log(`🔍 [DOCUMENT DEBUG] Request body:`, req.body);
      console.log(`🔍 [DOCUMENT DEBUG] Document data:`, data);
      console.log(`🔍 [DOCUMENT DEBUG] User ID:`, req.user?.id);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        console.log(`❌ [DOCUMENT DEBUG] Backend SDK not initialized`);
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      console.log(`✅ [DOCUMENT DEBUG] Backend SDK is available`);

      // Set current user ID for the SDK
      this.backendSDK.setCurrentUserId(req.user?.id || "system");

      // Use SDK method to create document
      console.log(`🔍 [DOCUMENT DEBUG] Calling SDK createDocument method...`);
      const document = await this.backendSDK.createDocument(
        sanitizedId,
        collectionName,
        {
          data,
          created_by: req.user?.id,
        }
      );

      console.log(
        `✅ [DOCUMENT DEBUG] Document created successfully:`,
        document
      );

      // Ensure document is not undefined before returning
      if (!document) {
        console.error("❌ [DOCUMENT DEBUG] Document is undefined");
        return res.status(500).json({
          success: false,
          error: "Document creation failed: document is undefined",
        });
      }

      res.status(201).json({
        success: true,
        data: document,
      });
    } catch (error) {
      console.error("❌ [DOCUMENT DEBUG] Error creating document:", error);
      console.error(
        "❌ [DOCUMENT DEBUG] Error stack:",
        error instanceof Error ? error.stack : "No stack"
      );

      // Check if it's a validation error by looking at the original error
      let isValidationError = false;
      let originalErrorMessage = "";

      if (error instanceof Error) {
        // Check the current error message
        if (
          error.message.includes("Required field") ||
          error.message.includes("validation") ||
          error.message.includes("missing")
        ) {
          isValidationError = true;
          originalErrorMessage = error.message;
        }

        // Also check if there's a cause property (for wrapped errors)
        if (error.cause && error.cause instanceof Error) {
          const causeMessage = error.cause.message;
          if (
            causeMessage.includes("Required field") ||
            causeMessage.includes("validation") ||
            causeMessage.includes("missing")
          ) {
            isValidationError = true;
            originalErrorMessage = causeMessage;
          }
        }

        // Check the error stack trace for validation keywords
        if (error.stack) {
          const stackLines = error.stack.split("\n");
          for (const line of stackLines) {
            if (
              line.includes("Required field") ||
              line.includes("validation") ||
              line.includes("missing")
            ) {
              isValidationError = true;
              originalErrorMessage = line.trim();
              break;
            }
          }
        }

        // Check if the error name indicates validation
        if (error.name === "ValidationError" || error.name === "TypeError") {
          isValidationError = true;
          originalErrorMessage = error.message;
        }
      }

      console.log("Is validation error:", isValidationError);
      console.log("Original error message:", originalErrorMessage);
      console.log(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack"
      );

      if (isValidationError) {
        console.log("Returning 400 validation error");
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: originalErrorMessage || error.message,
        });
      } else {
        console.log("Returning 500 server error");
        res.status(500).json({
          success: false,
          error: "Failed to create document",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    }
  }

  /**
   * Get documents from a collection
   */
  async getDocuments(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);
      const {
        limit = 100,
        offset = 0,
        sortBy: _sortBy,
        sortOrder: _sortOrder,
        orderBy,
        order,
        filter,
      } = req.query;

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Parse filter parameters
      let documentFilter: Record<string, unknown> | undefined = undefined;

      // Handle different filter formats
      if (filter && typeof filter === "object") {
        documentFilter = {
          field_filters: {},
        };

        // Cast filter to Record<string, unknown> to access properties dynamically
        const filterObj = filter as Record<string, unknown>;

        // Handle nested filter format: filter[status]=todo becomes { filter: { status: "todo" } }
        if (filterObj.status || filterObj.priority || filterObj.is_active) {
          // Direct field filters
          if (filterObj.status)
            (documentFilter.field_filters as Record<string, unknown>).status =
              filterObj.status;
          if (filterObj.priority)
            (documentFilter.field_filters as Record<string, unknown>).priority =
              filterObj.priority;
          if (filterObj.is_active !== undefined)
            (
              documentFilter.field_filters as Record<string, unknown>
            ).is_active = filterObj.is_active;
        }

        // Handle complex filters like filter[priority][gte]=5
        for (const [key, value] of Object.entries(filterObj)) {
          if (key !== "status" && key !== "priority" && key !== "is_active") {
            if (typeof value === "string") {
              (documentFilter.field_filters as Record<string, unknown>)[key] =
                value;
            } else if (typeof value === "object" && value !== null) {
              (documentFilter.field_filters as Record<string, unknown>)[key] =
                value;
            }
          }
        }
      }

      console.log(
        "🔍 [DOCUMENTS DEBUG] Raw query:",
        JSON.stringify(req.query, null, 2)
      );
      console.log(
        "🔍 [DOCUMENTS DEBUG] Filter:",
        JSON.stringify(filter, null, 2)
      );
      console.log(
        "🔍 [DOCUMENTS DEBUG] Parsed filter:",
        JSON.stringify(documentFilter, null, 2)
      );

      const documents = await this.backendSDK.getDocuments(
        sanitizedId,
        collectionName,
        documentFilter,
        {
          limit: Number(limit),
          offset: Number(offset),
          orderBy: (orderBy || _sortBy) as string,
          order: (order || _sortOrder) as "asc" | "desc",
        }
      );

      // Return the documents in the expected format
      res.status(200).json({
        data: documents,
        total: documents.length,
        limit: Number(limit),
        offset: Number(offset),
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

  /**
   * Count documents in a collection
   */
  async countDocuments(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);
      const { filter } = req.query;

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Parse filter parameters
      let documentFilter: Record<string, unknown> | undefined = undefined;
      if (filter && typeof filter === "object") {
        documentFilter = {};

        // Handle simple field filters like filter[status]=todo
        for (const [key, value] of Object.entries(filter)) {
          if (typeof value === "string") {
            if (!documentFilter.field_filters) {
              documentFilter.field_filters = {};
            }
            documentFilter.field_filters[key] = value;
          }
        }
      }

      const count = await this.backendSDK.countDocuments(
        sanitizedId,
        collectionName,
        documentFilter
      );

      // Ensure count is a number
      const countValue =
        typeof count === "number" ? count : parseInt(String(count || 0), 10);

      // Debug logging
      console.log(
        "Backend countDocuments - count:",
        count,
        "type:",
        typeof count
      );
      console.log(
        "Backend countDocuments - countValue:",
        countValue,
        "type:",
        typeof countValue
      );

      res.status(200).json({
        success: true,
        count: countValue,
      });
    } catch (error) {
      console.error("Error counting documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to count documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }

  /**
   * Get a document by ID
   */
  async getDocumentById(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName, documentId } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Use SDK method to get document
      const document = await this.backendSDK.getDocument(
        sanitizedId,
        collectionName,
        documentId
      );

      if (!document) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
        });
      }

      res.status(200).json(document);
    } catch (error) {
      console.error("Error getting document:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get document",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }

  /**
   * Update a document
   */
  async updateDocument(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName, documentId } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);
      const { data } = req.body;

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Use SDK method to update document
      const document = await this.backendSDK.updateDocument(
        sanitizedId,
        collectionName,
        documentId,
        data
      );

      res.status(200).json(document);
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

  /**
   * Delete a document
   */
  async deleteDocument(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName, documentId } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Use SDK method to delete document
      const success = await this.backendSDK.deleteDocument(
        sanitizedId,
        collectionName,
        documentId
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
        });
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

  /**
   * Search documents in a collection
   */
  async searchDocuments(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);
      const { query: searchQuery, limit = 100, offset = 0 } = req.body;

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Implement document search functionality
      if (
        !searchQuery ||
        typeof searchQuery !== "string" ||
        searchQuery.trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
        });
      }

      // Use SDK method to search documents
      const documents = await this.backendSDK.searchDocuments(
        sanitizedId,
        collectionName,
        {
          text: searchQuery,
          limit: Number(limit),
          offset: Number(offset),
        }
      );

      res.status(200).json({
        success: true,
        documents,
        total: documents.length,
        limit: Number(limit),
        offset: Number(offset),
        query: searchQuery,
      });
    } catch (error) {
      console.error("Error searching documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to search documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }

  /**
   * Bulk create documents
   */
  async bulkCreateDocuments(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);
      const { documents } = req.body;

      console.log(
        `🔍 [BULK CREATE DEBUG] Creating ${
          documents?.length || 0
        } documents in project ${sanitizedId}, collection ${collectionName}`
      );
      console.log(`🔍 [BULK CREATE DEBUG] Request body:`, req.body);
      console.log(`🔍 [BULK CREATE DEBUG] User ID:`, req.user?.id);
      console.log(`🔍 [BULK CREATE DEBUG] Full req.user:`, req.user);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        console.log(`❌ [BULK CREATE DEBUG] Backend SDK not initialized`);
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      console.log(`✅ [BULK CREATE DEBUG] Backend SDK is available`);

      // Set current user ID for SDK operations
      this.backendSDK.setCurrentUserId(req.user?.id || "system");

      // Convert documents to CreateDocumentRequest format
      const documentRequests = documents.map(
        (doc: Record<string, unknown>) => ({
          data: (doc as { data: unknown }).data, // Extract the data property from the document
          created_by: req.user?.id || "system",
        })
      );

      console.log(
        `🔍 [BULK CREATE DEBUG] Document requests:`,
        documentRequests
      );

      // Use SDK method to create documents
      console.log(
        `🔍 [BULK CREATE DEBUG] Calling SDK createDocuments method...`
      );
      const createdDocuments = await this.backendSDK.createDocuments(
        sanitizedId,
        collectionName,
        documentRequests
      );

      console.log(
        `✅ [BULK CREATE DEBUG] Documents created successfully:`,
        createdDocuments
      );

      res.status(201).json({
        success: true,
        created: createdDocuments,
        errors: [],
        total: createdDocuments.length,
      } as { success: true; created: unknown[]; errors: unknown[]; total: number });
    } catch (error) {
      console.error(
        "❌ [BULK CREATE DEBUG] Error bulk creating documents:",
        error
      );
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

  /**
   * Bulk update documents
   */
  async bulkUpdateDocuments(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);
      const { updates } = req.body;

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Use SDK method to update documents
      const updatedDocuments = await this.backendSDK.updateDocuments(
        sanitizedId,
        collectionName,
        updates
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

  /**
   * Bulk delete documents
   */
  async bulkDeleteDocuments(req: ExtendedRequest, res: Response) {
    console.log("[BULK DELETE] Controller called");
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);
      const { document_ids: documentIds } = req.body;

      console.log(
        `[BULK DELETE] Project: ${sanitizedId}, Collection: ${collectionName}`
      );
      console.log(`[BULK DELETE] Document IDs:`, documentIds);

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        console.log("[BULK DELETE] SDK not initialized");
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      console.log("[BULK DELETE] Calling SDK deleteDocuments");
      // Use SDK method to delete documents
      const deleteResults = await this.backendSDK.deleteDocuments(
        sanitizedId,
        collectionName,
        documentIds
      );
      console.log("[BULK DELETE] SDK returned:", deleteResults);

      // SDK now returns detailed results
      const response = {
        success: deleteResults.success,
        deleted_count: deleteResults.deleted_count,
        errors: deleteResults.errors,
        total: documentIds.length,
      };

      console.log("[BULK DELETE] Sending response:", response);
      res.status(200).json(response);
    } catch (error) {
      console.error("[BULK DELETE] Error:", error);
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

  /**
   * Aggregate documents in a collection
   */
  async aggregateDocuments(req: ExtendedRequest, res: Response) {
    try {
      const { projectId, collectionName } = req.params;
      const sanitizedId = this.sanitizeProjectId(projectId);
      const { group_by, aggregations } = req.body;

      // Get the backendSDK from the instance
      if (!this.backendSDK) {
        return res.status(500).json({
          success: false,
          error: "Backend SDK not initialized",
        });
      }

      // Validate input parameters
      if (!group_by || !Array.isArray(group_by) || group_by.length === 0) {
        return res.status(400).json({
          success: false,
          error: "group_by array is required and must not be empty",
        });
      }

      // Implement real aggregation functionality
      const pipeline = [
        {
          $group: {
            _id: group_by.reduce(
              (acc: Record<string, unknown>, field: string) => ({
                ...acc,
                [field]: `$${field}`,
              }),
              {}
            ),
            count: { $sum: 1 },
          },
        },
        ...(aggregations || []),
      ];

      const aggregationResults = await this.backendSDK.aggregateDocuments(
        sanitizedId,
        collectionName,
        pipeline
      );

      res.status(200).json({
        success: true,
        groups: aggregationResults,
        total_groups: aggregationResults.length,
        aggregations: aggregations || [],
      });
    } catch (error) {
      console.error("Error aggregating documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to aggregate documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}
