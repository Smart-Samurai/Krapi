import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

// Collection handlers
import { CreateCollectionHandler } from "./handlers/collections/create-collection.handler";
import { DeleteCollectionHandler } from "./handlers/collections/delete-collection.handler";
import { GetAllCollectionsHandler } from "./handlers/collections/get-all-collections.handler";
import { GetCollectionByNameHandler } from "./handlers/collections/get-collection-by-name.handler";
import { GetCollectionStatisticsHandler } from "./handlers/collections/get-collection-statistics.handler";
import { UpdateCollectionHandler } from "./handlers/collections/update-collection.handler";
import { ValidateCollectionSchemaHandler } from "./handlers/collections/validate-collection-schema.handler";
// Document handlers
import { AggregateDocumentsHandler } from "./handlers/documents/aggregate-documents.handler";
import { BulkCreateDocumentsHandler } from "./handlers/documents/bulk-create-documents.handler";
import { BulkDeleteDocumentsHandler } from "./handlers/documents/bulk-delete-documents.handler";
import { BulkUpdateDocumentsHandler } from "./handlers/documents/bulk-update-documents.handler";
import { CountDocumentsHandler } from "./handlers/documents/count-documents.handler";
import { CreateDocumentHandler } from "./handlers/documents/create-document.handler";
import { DeleteDocumentHandler } from "./handlers/documents/delete-document.handler";
import { GetDocumentByIdHandler } from "./handlers/documents/get-document-by-id.handler";
import { GetDocumentsHandler } from "./handlers/documents/get-documents.handler";
import { SearchDocumentsHandler } from "./handlers/documents/search-documents.handler";
import { UpdateDocumentHandler } from "./handlers/documents/update-document.handler";

import { ExtendedRequest } from "@/types";

// Type alias for Response to match Express's generic type
type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Collections Controller
 * 
 * Handles all collection-related HTTP requests including:
 * - Collection CRUD operations
 * - Collection schema management
 * - Field and index management
 * - Collection validation
 * - Document CRUD operations
 * - Document search and aggregation
 * 
 * All operations use the BackendSDK for database access.
 * Requires authentication and proper project scopes.
 * 
 * This controller now delegates to specialized handlers for each operation.
 * 
 * @class CollectionsController
 * @example
 * const controller = new CollectionsController();
 * controller.setBackendSDK(backendSDK);
 * // Controller is ready to handle requests
 */
export class CollectionsController {

  // Collection handlers
  private getAllCollectionsHandler?: GetAllCollectionsHandler;
  private getCollectionByNameHandler?: GetCollectionByNameHandler;
  private createCollectionHandler?: CreateCollectionHandler;
  private updateCollectionHandler?: UpdateCollectionHandler;
  private deleteCollectionHandler?: DeleteCollectionHandler;
  private getCollectionStatisticsHandler?: GetCollectionStatisticsHandler;
  private validateCollectionSchemaHandler?: ValidateCollectionSchemaHandler;

  // Document handlers
  private createDocumentHandler?: CreateDocumentHandler;
  private getDocumentsHandler?: GetDocumentsHandler;
  private countDocumentsHandler?: CountDocumentsHandler;
  private getDocumentByIdHandler?: GetDocumentByIdHandler;
  private updateDocumentHandler?: UpdateDocumentHandler;
  private deleteDocumentHandler?: DeleteDocumentHandler;
  private searchDocumentsHandler?: SearchDocumentsHandler;
  private bulkCreateDocumentsHandler?: BulkCreateDocumentsHandler;
  private bulkUpdateDocumentsHandler?: BulkUpdateDocumentsHandler;
  private bulkDeleteDocumentsHandler?: BulkDeleteDocumentsHandler;
  private aggregateDocumentsHandler?: AggregateDocumentsHandler;

  /**
   * Set the BackendSDK instance and initialize handlers
   * 
   * @param {BackendSDK} sdk - The BackendSDK instance to use
   * @returns {void}
   * 
   * @example
   * controller.setBackendSDK(backendSDK);
   */
  setBackendSDK(sdk: BackendSDK) {

    // Initialize collection handlers
    this.getAllCollectionsHandler = new GetAllCollectionsHandler(sdk);
    this.getCollectionByNameHandler = new GetCollectionByNameHandler(sdk);
    this.createCollectionHandler = new CreateCollectionHandler(sdk);
    this.updateCollectionHandler = new UpdateCollectionHandler(sdk);
    this.deleteCollectionHandler = new DeleteCollectionHandler(sdk);
    this.getCollectionStatisticsHandler = new GetCollectionStatisticsHandler(sdk);
    this.validateCollectionSchemaHandler = new ValidateCollectionSchemaHandler(sdk);

    // Initialize document handlers
    this.createDocumentHandler = new CreateDocumentHandler(sdk);
    this.getDocumentsHandler = new GetDocumentsHandler(sdk);
    this.countDocumentsHandler = new CountDocumentsHandler(sdk);
    this.getDocumentByIdHandler = new GetDocumentByIdHandler(sdk);
    this.updateDocumentHandler = new UpdateDocumentHandler(sdk);
    this.deleteDocumentHandler = new DeleteDocumentHandler(sdk);
    this.searchDocumentsHandler = new SearchDocumentsHandler(sdk);
    this.bulkCreateDocumentsHandler = new BulkCreateDocumentsHandler(sdk);
    this.bulkUpdateDocumentsHandler = new BulkUpdateDocumentsHandler(sdk);
    this.bulkDeleteDocumentsHandler = new BulkDeleteDocumentsHandler(sdk);
    this.aggregateDocumentsHandler = new AggregateDocumentsHandler(sdk);
  }

  // Collection methods - delegate to handlers
  async getAllCollections(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.getAllCollectionsHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.getAllCollectionsHandler.handle(req, res);
  }

  async getCollectionByName(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.getCollectionByNameHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.getCollectionByNameHandler.handle(req, res);
  }

  async createCollection(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.createCollectionHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.createCollectionHandler.handle(req, res);
  }

  async updateCollection(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.updateCollectionHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.updateCollectionHandler.handle(req, res);
  }

  async deleteCollection(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.deleteCollectionHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.deleteCollectionHandler.handle(req, res);
  }

  async getCollectionStatistics(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.getCollectionStatisticsHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.getCollectionStatisticsHandler.handle(req, res);
  }

  async validateCollectionSchema(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.validateCollectionSchemaHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.validateCollectionSchemaHandler.handle(req, res);
  }

  // Document methods - delegate to handlers
  async createDocument(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.createDocumentHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.createDocumentHandler.handle(req, res);
  }

  async getDocuments(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.getDocumentsHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.getDocumentsHandler.handle(req, res);
  }

  async countDocuments(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.countDocumentsHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.countDocumentsHandler.handle(req, res);
  }

  async getDocumentById(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.getDocumentByIdHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.getDocumentByIdHandler.handle(req, res);
  }

  async updateDocument(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.updateDocumentHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.updateDocumentHandler.handle(req, res);
  }

  async deleteDocument(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.deleteDocumentHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.deleteDocumentHandler.handle(req, res);
  }

  async searchDocuments(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.searchDocumentsHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.searchDocumentsHandler.handle(req, res);
  }

  async bulkCreateDocuments(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.bulkCreateDocumentsHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.bulkCreateDocumentsHandler.handle(req, res);
  }

  async bulkUpdateDocuments(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.bulkUpdateDocumentsHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.bulkUpdateDocumentsHandler.handle(req, res);
  }

  async bulkDeleteDocuments(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.bulkDeleteDocumentsHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.bulkDeleteDocumentsHandler.handle(req, res);
  }

  async aggregateDocuments(req: ExtendedRequest, res: Response): Promise<void> {
    if (!this.aggregateDocumentsHandler) {
      res.status(500).json({
        success: false,
        error: "Backend SDK not initialized",
      });
      return;
    }
    await this.aggregateDocumentsHandler.handle(req, res);
  }
}
