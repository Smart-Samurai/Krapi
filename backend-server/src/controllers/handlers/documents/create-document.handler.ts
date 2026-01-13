import KrapiLogger from "@krapi/logger";
import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";
import { extractErrorDetails, logError, isValidationError } from "@/utils/error-utils";

const logger = KrapiLogger.getInstance();

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for creating a document
 * POST /krapi/k1/projects/:projectId/collections/:collectionName/documents
 */
export class CreateDocumentHandler {
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
      const { data } = req.body;

      logger.debug("api", `Creating document in project ${sanitizedId}, collection ${collectionName}`, {
        projectId: sanitizedId,
        collectionName,
        userId: req.user?.id,
      });

      // Set current user ID for the SDK
      this.backendSDK.setCurrentUserId(req.user?.id || "system");

      // Use SDK method to create document
      const document = await this.backendSDK.createDocument(
        sanitizedId,
        collectionName,
        {
          data,
          created_by: req.user?.id,
        }
      );

      logger.info("api", `Document created successfully`, {
        documentId: document?.id,
        projectId: sanitizedId,
        collectionName,
      });

      // Ensure document is not undefined before returning
      if (!document) {
        logger.error("api", "Document creation failed: document is undefined", {
          projectId: sanitizedId,
          collectionName,
        });
        res.status(500).json({
          success: false,
          error: "Document creation failed: document is undefined",
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: document,
      });
    } catch (error) {
      // Use SDK error utilities for detailed error extraction
      const errorDetails = extractErrorDetails(error);
      logError("createDocument", error);

      logger.error("api", "Error creating document", {
        code: errorDetails.code,
        status: errorDetails.status,
        message: errorDetails.message,
        projectId: req.params.projectId,
        collectionName: req.params.collectionName,
      });

      // Use SDK error code to determine if it's a validation error
      const isValidation = isValidationError(error);
      const statusCode = isValidation ? 400 : errorDetails.status;

      res.status(statusCode).json({
        success: false,
        error: errorDetails.message || "Failed to create document",
        code: errorDetails.code,
        details: process.env.NODE_ENV === "development" ? errorDetails.details : undefined,
      });
    }
  }
}








