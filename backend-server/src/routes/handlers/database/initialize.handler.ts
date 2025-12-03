import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for initializing database
 * POST /krapi/k1/database/initialize
 * 
 * SDK-FIRST: Uses backendSDK.database.initialize() instead of custom implementation.
 * Note: This is a server-only operation.
 */
export class InitializeDatabaseHandler {
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

      // SDK-FIRST: Use backendSDK.database.autoFix() to initialize database
      // Note: DatabaseHealthManager doesn't have initialize(), but autoFix() will create missing tables
      const autoFixResult = await this.backendSDK.database.autoFix();
      const result = {
        success: autoFixResult.success,
        message: autoFixResult.success ? "Database initialized successfully" : "Database initialization failed",
        tablesCreated: autoFixResult.fixesApplied || [],
        defaultDataInserted: false,
      };

      res.json({
        success: result.success,
        message: result.message,
        tablesCreated: result.tablesCreated,
        defaultDataInserted: result.defaultDataInserted,
      });
    } catch (error) {
      console.error("Initialize database error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to initialize database",
      });
    }
  }
}


