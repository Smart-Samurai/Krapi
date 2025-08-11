import { Request, Response } from "express";
import { DatabaseService } from "@/services/database.service";
import {
  AuthenticatedRequest,
  ApiResponse,
  PaginatedResponse,
  Collection,
  Document,
  ChangeAction,
  FieldType,
  CollectionField,
  FieldValidation,
} from "@/types";

export class CollectionsController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Get all collections for a project
  getCollections = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      // Use the database service directly for now
      const collections = await this.db.getProjectCollections(projectId);

      res.status(200).json({
        success: true,
        data: collections,
      } as ApiResponse<Collection[]>);
      return;
    } catch (error) {
      console.error("Get collections error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch collections",
      } as ApiResponse);
      return;
    }
  };

  // Get collection by name
  getCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;

      const collection = await this.db.getCollection(projectId, collectionName);

      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: collection,
      } as ApiResponse<Collection>);
      return;
    } catch (error) {
      console.error("Get collection error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch collection",
      } as ApiResponse);
      return;
    }
  };

  // Create a new collection
  createCollection = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { name, description, fields = [], indexes = [] } = req.body;

      console.log("Creating collection:", { projectId, name, user: req.user });

      // Verify project exists
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Check if collection already exists
      const existing = await this.db.getCollection(projectId, name);
      if (existing) {
        res.status(409).json({
          success: false,
          error: "Collection with this name already exists",
        } as ApiResponse);
        return;
      }

      // Validate collection name
      if (!this.isValidCollectionName(name)) {
        res.status(400).json({
          success: false,
          error:
            "Invalid collection name. Use only letters, numbers, and underscores.",
        } as ApiResponse);
        return;
      }

      // Create the collection
      const collection = await this.db.createCollection(
        projectId,
        name,
        { description, fields, indexes },
        req.user!.id
      );

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "collection",
        entity_id: collection.id,
        action: ChangeAction.CREATED,
        changes: { name, fields: fields.length },
        performed_by: req.user?.id || "unknown",
        session_id: req.session?.id,
      });

      res.status(201).json({
        success: true,
        data: collection,
      } as ApiResponse<Collection>);
      return;
    } catch (error) {
      console.error("Create collection error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create collection",
      } as ApiResponse);
      return;
    }
  };

  // Update collection
  updateCollection = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const updates = req.body;

      // Check if collection exists
      const existing = await this.db.getCollection(projectId, collectionName);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      // Validate field updates if provided
      if (updates.fields) {
        const validation = this.validateCollectionFields(updates.fields);
        if (!validation.valid) {
          res.status(400).json({
            success: false,
            error: validation.error,
          } as ApiResponse);
          return;
        }
      }

      // Update the collection
      const updated = await this.db.updateCollection(
        projectId,
        collectionName,
        updates
      );

      if (!updated) {
        res.status(500).json({
          success: false,
          error: "Failed to update collection",
        } as ApiResponse);
        return;
      }

      // Log the changes
      const changes: Record<string, unknown> = {};
      if (updates.description !== existing.description) {
        changes.description = {
          from: existing.description,
          to: updates.description,
        };
      }
      if (updates.fields) {
        changes.fields = {
          from: existing.fields.length,
          to: updates.fields.length,
        };
      }

      if (Object.keys(changes).length > 0) {
        await this.db.createChangelogEntry({
          project_id: projectId,
          entity_type: "collection",
          entity_id: existing.id,
          action: ChangeAction.UPDATED,
          changes,
          performed_by: req.user?.id || "unknown",
          session_id: req.session?.id,
        });
      }

      res.status(200).json({
        success: true,
        data: updated,
      } as ApiResponse<Collection>);
      return;
    } catch (error) {
      console.error("Update collection error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update collection",
      } as ApiResponse);
      return;
    }
  };

  // Delete collection
  deleteCollection = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;

      // Check if collection exists
      const existing = await this.db.getCollection(projectId, collectionName);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      // Check if collection has documents
      const { total } = await this.db.getDocumentsByCollection(existing.id);
      if (total > 0) {
        res.status(409).json({
          success: false,
          error: `Cannot delete collection with ${total} documents. Delete all documents first.`,
        } as ApiResponse);
        return;
      }

      // Delete the collection
      const deleted = await this.db.deleteCollection(projectId, collectionName);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: "Failed to delete collection",
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "collection",
        entity_id: existing.id,
        action: ChangeAction.DELETED,
        changes: { name: collectionName },
        performed_by: req.user?.id || "unknown",
        session_id: req.session?.id,
      });

      res.status(200).json({
        success: true,
        message: "Collection deleted successfully",
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Delete collection error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete collection",
      } as ApiResponse);
      return;
    }
  };

  // Get documents from a collection
  getDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const {
        page = 1,
        limit = 50,
        orderBy = "created_at",
        order = "desc",
        ...filters
      } = req.query;

      // Verify collection exists
      const collection = await this.db.getCollection(projectId, collectionName);
      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100);
      const offset = (pageNum - 1) * limitNum;

      const { documents, total } = await this.db.getDocuments(
        projectId,
        collectionName,
        {
          limit: limitNum,
          offset,
          orderBy: orderBy as string,
          order: order as "asc" | "desc",
          where: filters as Record<string, unknown>,
        }
      );

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        success: true,
        data: documents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      } as PaginatedResponse<Document>);
      return;
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch documents",
      } as ApiResponse);
      return;
    }
  };

  // Get a single document
  getDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, collectionName, documentId } = req.params;

      const document = await this.db.getDocument(
        projectId,
        collectionName,
        documentId
      );

      if (!document) {
        res.status(404).json({
          success: false,
          error: "Document not found",
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: document,
      } as ApiResponse<Document>);
      return;
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch document",
      } as ApiResponse);
      return;
    }
  };

  // Create a new document
  createDocument = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const { data } = req.body;

      if (!data || typeof data !== "object") {
        res.status(400).json({
          success: false,
          error: "Document data is required",
        } as ApiResponse);
        return;
      }

      // Verify collection exists
      const collection = await this.db.getCollection(projectId, collectionName);
      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      // Validate document against collection fields
      const validation = this.validateDocument(data, collection.fields);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        } as ApiResponse);
        return;
      }

      // Create the document
      const document = await this.db.createDocument(
        projectId,
        collectionName,
        data,
        req.user?.id
      );

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "document",
        entity_id: document.id,
        action: ChangeAction.CREATED,
        changes: { collection: collectionName },
        performed_by: req.user?.id || "unknown",
        session_id: req.session?.id,
      });

      res.status(201).json({
        success: true,
        data: document,
      } as ApiResponse<Document>);
      return;
    } catch (error) {
      console.error("Create document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create document",
      } as ApiResponse);
      return;
    }
  };

  // Update a document
  updateDocument = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName, documentId } = req.params;
      const { data } = req.body;

      if (!data || typeof data !== "object") {
        res.status(400).json({
          success: false,
          error: "Document data is required",
        } as ApiResponse);
        return;
      }

      // Verify document exists
      const existing = await this.db.getDocument(
        projectId,
        collectionName,
        documentId
      );
      if (!existing) {
        res.status(404).json({
          success: false,
          error: "Document not found",
        } as ApiResponse);
        return;
      }

      // Get collection for validation
      const collection = await this.db.getCollection(projectId, collectionName);
      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      // Validate document against collection fields
      const validation = this.validateDocument(data, collection.fields);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        } as ApiResponse);
        return;
      }

      // Update the document
      const updated = await this.db.updateDocument(
        projectId,
        collectionName,
        documentId,
        data,
        req.user?.id
      );

      if (!updated) {
        res.status(500).json({
          success: false,
          error: "Failed to update document",
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "document",
        entity_id: documentId,
        action: ChangeAction.UPDATED,
        changes: { collection: collectionName },
        performed_by: req.user?.id || "unknown",
        session_id: req.session?.id,
      });

      res.status(200).json({
        success: true,
        data: updated,
      } as ApiResponse<Document>);
      return;
    } catch (error) {
      console.error("Update document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update document",
      } as ApiResponse);
      return;
    }
  };

  // Delete a document
  deleteDocument = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName, documentId } = req.params;

      // Verify document exists
      const existing = await this.db.getDocument(
        projectId,
        collectionName,
        documentId
      );
      if (!existing) {
        res.status(404).json({
          success: false,
          error: "Document not found",
        } as ApiResponse);
        return;
      }

      // Delete the document
      const deleted = await this.db.deleteDocument(
        projectId,
        collectionName,
        documentId
      );

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: "Failed to delete document",
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        project_id: projectId,
        entity_type: "document",
        entity_id: documentId,
        action: ChangeAction.DELETED,
        changes: { collection: collectionName },
        performed_by: req.user?.id || "unknown",
        session_id: req.session?.id,
      });

      res.status(200).json({
        success: true,
        message: "Document deleted successfully",
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete document",
      } as ApiResponse);
      return;
    }
  };

  // Batch create documents
  batchCreateDocuments = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const { documents } = req.body;

      if (!documents || !Array.isArray(documents)) {
        res.status(400).json({
          success: false,
          error: "Documents array is required",
        } as ApiResponse);
        return;
      }

      if (documents.length === 0) {
        res.status(400).json({
          success: false,
          error: "Documents array cannot be empty",
        } as ApiResponse);
        return;
      }

      if (documents.length > 1000) {
        res.status(400).json({
          success: false,
          error: "Maximum 1000 documents allowed per batch",
        } as ApiResponse);
        return;
      }

      // Verify collection exists
      const collection = await this.db.getCollection(projectId, collectionName);
      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      // Validate all documents
      const validationErrors: string[] = [];
      documents.forEach((doc, index) => {
        if (!doc || typeof doc !== "object") {
          validationErrors.push(`Document at index ${index} is invalid`);
          return;
        }
        const validation = this.validateDocument(doc, collection.fields);
        if (!validation.valid) {
          validationErrors.push(
            `Document at index ${index}: ${validation.error}`
          );
        }
      });

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validationErrors,
        } as ApiResponse);
        return;
      }

      // Create all documents
      const createdDocuments: Document[] = [];
      const errors: { index: number; error: string }[] = [];

      for (let i = 0; i < documents.length; i++) {
        try {
          const document = await this.db.createDocument(
            projectId,
            collectionName,
            documents[i],
            req.user?.id
          );
          createdDocuments.push(document);

          // Log the action
          await this.db.createChangelogEntry({
            project_id: projectId,
            entity_type: "document",
            entity_id: document.id,
            action: ChangeAction.CREATED,
            changes: { collection: collectionName, batch: true },
            performed_by: req.user?.id || "unknown",
            session_id: req.session?.id,
          });
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          created: createdDocuments,
          failed: errors,
          summary: {
            total: documents.length,
            created: createdDocuments.length,
            failed: errors.length,
          },
        },
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Batch create documents error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create documents",
      } as ApiResponse);
      return;
    }
  };

  // Batch update documents
  batchUpdateDocuments = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates)) {
        res.status(400).json({
          success: false,
          error: "Updates array is required",
        } as ApiResponse);
        return;
      }

      if (updates.length === 0) {
        res.status(400).json({
          success: false,
          error: "Updates array cannot be empty",
        } as ApiResponse);
        return;
      }

      if (updates.length > 1000) {
        res.status(400).json({
          success: false,
          error: "Maximum 1000 updates allowed per batch",
        } as ApiResponse);
        return;
      }

      // Verify collection exists
      const collection = await this.db.getCollection(projectId, collectionName);
      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      // Validate all updates
      const validationErrors: string[] = [];
      updates.forEach((update, index) => {
        if (!update || typeof update !== "object") {
          validationErrors.push(`Update at index ${index} is invalid`);
          return;
        }
        if (!update.id) {
          validationErrors.push(
            `Update at index ${index}: Document ID is required`
          );
          return;
        }
        if (!update.data || typeof update.data !== "object") {
          validationErrors.push(
            `Update at index ${index}: Data object is required`
          );
          return;
        }
        const validation = this.validateDocument(
          update.data,
          collection.fields
        );
        if (!validation.valid) {
          validationErrors.push(
            `Update at index ${index}: ${validation.error}`
          );
        }
      });

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validationErrors,
        } as ApiResponse);
        return;
      }

      // Update all documents
      const updatedDocuments: Document[] = [];
      const errors: { index: number; id: string; error: string }[] = [];

      for (let i = 0; i < updates.length; i++) {
        try {
          // Verify document exists
          const existing = await this.db.getDocument(
            projectId,
            collectionName,
            updates[i].id
          );
          if (!existing) {
            errors.push({
              index: i,
              id: updates[i].id,
              error: "Document not found",
            });
            continue;
          }

          const updated = await this.db.updateDocument(
            projectId,
            collectionName,
            updates[i].id,
            updates[i].data,
            req.user?.id
          );

          if (updated) {
            updatedDocuments.push(updated);

            // Log the action
            await this.db.createChangelogEntry({
              project_id: projectId,
              entity_type: "document",
              entity_id: updates[i].id,
              action: ChangeAction.UPDATED,
              changes: { collection: collectionName, batch: true },
              performed_by: req.user?.id || "unknown",
              session_id: req.session?.id,
            });
          } else {
            errors.push({
              index: i,
              id: updates[i].id,
              error: "Failed to update document",
            });
          }
        } catch (error) {
          errors.push({
            index: i,
            id: updates[i].id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          updated: updatedDocuments,
          failed: errors,
          summary: {
            total: updates.length,
            updated: updatedDocuments.length,
            failed: errors.length,
          },
        },
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Batch update documents error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update documents",
      } as ApiResponse);
      return;
    }
  };

  // Batch delete documents
  batchDeleteDocuments = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { projectId, collectionName } = req.params;
      const { documentIds } = req.body;

      if (!documentIds || !Array.isArray(documentIds)) {
        res.status(400).json({
          success: false,
          error: "Document IDs array is required",
        } as ApiResponse);
        return;
      }

      if (documentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: "Document IDs array cannot be empty",
        } as ApiResponse);
        return;
      }

      if (documentIds.length > 1000) {
        res.status(400).json({
          success: false,
          error: "Maximum 1000 documents allowed per batch",
        } as ApiResponse);
        return;
      }

      // Verify collection exists
      const collection = await this.db.getCollection(projectId, collectionName);
      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        } as ApiResponse);
        return;
      }

      // Delete all documents
      const deletedIds: string[] = [];
      const errors: { id: string; error: string }[] = [];

      for (const documentId of documentIds) {
        try {
          // Verify document exists
          const existing = await this.db.getDocument(
            projectId,
            collectionName,
            documentId
          );
          if (!existing) {
            errors.push({
              id: documentId,
              error: "Document not found",
            });
            continue;
          }

          const deleted = await this.db.deleteDocument(
            projectId,
            collectionName,
            documentId
          );

          if (deleted) {
            deletedIds.push(documentId);

            // Log the action
            await this.db.createChangelogEntry({
              project_id: projectId,
              entity_type: "document",
              entity_id: documentId,
              action: ChangeAction.DELETED,
              changes: { collection: collectionName, batch: true },
              performed_by: req.user?.id || "unknown",
              session_id: req.session?.id,
            });
          } else {
            errors.push({
              id: documentId,
              error: "Failed to delete document",
            });
          }
        } catch (error) {
          errors.push({
            id: documentId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          deleted: deletedIds,
          failed: errors,
          summary: {
            total: documentIds.length,
            deleted: deletedIds.length,
            failed: errors.length,
          },
        },
      } as ApiResponse);
      return;
    } catch (error) {
      console.error("Batch delete documents error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete documents",
      } as ApiResponse);
      return;
    }
  };

  // Helper methods
  private isValidCollectionName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private validateCollectionFields(fields: CollectionField[]): {
    valid: boolean;
    error?: string;
  } {
    if (!Array.isArray(fields)) {
      return { valid: false, error: "Fields must be an array" };
    }

    const fieldNames = new Set<string>();

    for (const field of fields) {
      // Check required properties
      if (!field.name || !field.type) {
        return { valid: false, error: "Each field must have a name and type" };
      }

      // Check for duplicate field names
      if (fieldNames.has(field.name)) {
        return { valid: false, error: `Duplicate field name: ${field.name}` };
      }
      fieldNames.add(field.name);

      // Validate field name
      if (!this.isValidFieldName(field.name)) {
        return {
          valid: false,
          error: `Invalid field name: ${field.name}. Use only letters, numbers, and underscores.`,
        };
      }

      // Validate field type
      const validTypes: FieldType[] = [
        "string",
        "number",
        "boolean",
        "date",
        "array",
        "object",
      ];
      if (!validTypes.includes(field.type as FieldType)) {
        return { valid: false, error: `Invalid field type: ${field.type}` };
      }

      // Validate field validation rules if present
      if (field.validation) {
        const validationResult = this.validateFieldValidation(
          field.type as FieldType,
          field.validation
        );
        if (!validationResult.valid) {
          return {
            valid: false,
            error: `Field ${field.name}: ${validationResult.error}`,
          };
        }
      }
    }

    return { valid: true };
  }

  private isValidFieldName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private validateFieldValidation(
    type: FieldType,
    validation: FieldValidation
  ): { valid: boolean; error?: string } {
    switch (type) {
      case "string":
        if (validation.minLength !== undefined && validation.minLength < 0) {
          return { valid: false, error: "minLength must be non-negative" };
        }
        if (validation.maxLength !== undefined && validation.maxLength < 0) {
          return { valid: false, error: "maxLength must be non-negative" };
        }
        if (
          validation.minLength !== undefined &&
          validation.maxLength !== undefined &&
          validation.minLength > validation.maxLength
        ) {
          return {
            valid: false,
            error: "minLength cannot be greater than maxLength",
          };
        }
        break;

      case "number":
        if (
          validation.min !== undefined &&
          validation.max !== undefined &&
          validation.min > validation.max
        ) {
          return { valid: false, error: "min cannot be greater than max" };
        }
        break;

      case "array":
        if (validation.minItems !== undefined && validation.minItems < 0) {
          return { valid: false, error: "minItems must be non-negative" };
        }
        if (validation.maxItems !== undefined && validation.maxItems < 0) {
          return { valid: false, error: "maxItems must be non-negative" };
        }
        if (
          validation.minItems !== undefined &&
          validation.maxItems !== undefined &&
          validation.minItems > validation.maxItems
        ) {
          return {
            valid: false,
            error: "minItems cannot be greater than maxItems",
          };
        }
        break;
    }

    return { valid: true };
  }

  private validateDocument(
    data: Record<string, unknown>,
    fields: CollectionField[]
  ): { valid: boolean; error?: string } {
    // Check required fields
    for (const field of fields) {
      if (field.required && !(field.name in data)) {
        return { valid: false, error: `Missing required field: ${field.name}` };
      }

      // Validate field types and constraints
      if (field.name in data) {
        const value = data[field.name];
        const validationResult = this.validateFieldValue(field, value);
        if (!validationResult.valid) {
          return validationResult;
        }
      }
    }

    return { valid: true };
  }

  private validateFieldValue(
    field: CollectionField,
    value: unknown
  ): { valid: boolean; error?: string } {
    // Type validation
    switch (field.type) {
      case "string":
        if (typeof value !== "string") {
          return {
            valid: false,
            error: `Field ${field.name} must be a string`,
          };
        }
        if (field.validation) {
          if (
            field.validation.minLength !== undefined &&
            value.length < field.validation.minLength
          ) {
            return {
              valid: false,
              error: `Field ${field.name} must be at least ${field.validation.minLength} characters`,
            };
          }
          if (
            field.validation.maxLength !== undefined &&
            value.length > field.validation.maxLength
          ) {
            return {
              valid: false,
              error: `Field ${field.name} must be at most ${field.validation.maxLength} characters`,
            };
          }
          if (field.validation.pattern) {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(value)) {
              return {
                valid: false,
                error: `Field ${field.name} does not match the required pattern`,
              };
            }
          }
        }
        break;

      case "number":
        if (typeof value !== "number" || isNaN(value)) {
          return {
            valid: false,
            error: `Field ${field.name} must be a number`,
          };
        }
        if (field.validation) {
          if (
            field.validation.min !== undefined &&
            value < field.validation.min
          ) {
            return {
              valid: false,
              error: `Field ${field.name} must be at least ${field.validation.min}`,
            };
          }
          if (
            field.validation.max !== undefined &&
            value > field.validation.max
          ) {
            return {
              valid: false,
              error: `Field ${field.name} must be at most ${field.validation.max}`,
            };
          }
        }
        break;

      case "boolean":
        if (typeof value !== "boolean") {
          return {
            valid: false,
            error: `Field ${field.name} must be a boolean`,
          };
        }
        break;

      case "date":
        if (typeof value !== "string" || isNaN(Date.parse(value))) {
          return {
            valid: false,
            error: `Field ${field.name} must be a valid date string`,
          };
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          return {
            valid: false,
            error: `Field ${field.name} must be an array`,
          };
        }
        if (field.validation) {
          if (
            field.validation.minItems !== undefined &&
            value.length < field.validation.minItems
          ) {
            return {
              valid: false,
              error: `Field ${field.name} must have at least ${field.validation.minItems} items`,
            };
          }
          if (
            field.validation.maxItems !== undefined &&
            value.length > field.validation.maxItems
          ) {
            return {
              valid: false,
              error: `Field ${field.name} must have at most ${field.validation.maxItems} items`,
            };
          }
        }
        break;

      case "object":
        if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value)
        ) {
          return {
            valid: false,
            error: `Field ${field.name} must be an object`,
          };
        }
        break;
    }

    // Check unique constraint if applicable
    if (field.unique) {
      // This would need to be checked against the database
      // For now, we'll skip this validation at the controller level
    }

    return { valid: true };
  }
}
