import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for schema validation
 * GET /krapi/k1/health/validate-schema
 * 
 * SDK-FIRST: Uses backendSDK.health.validateSchema() instead of custom implementation.
 */
export class ValidateSchemaHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
        return;
      }

      // SDK-FIRST: Use backendSDK.database.validateSchema() (DatabaseHealthManager method)
      const result = await this.backendSDK.database.validateSchema();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Schema validation error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Schema validation failed",
      });
    }
  }
}


