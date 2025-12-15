import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for creating default admin user
 * POST /krapi/k1/database/create-default-admin
 * 
 * SDK-FIRST: Uses backendSDK.database.createDefaultAdmin() instead of custom implementation.
 * Note: This is a server-only operation.
 */
export class CreateDefaultAdminHandler {
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

      // SDK-FIRST: Use backendSDK.admin.createDefaultAdmin()
      // Note: AdminService has createDefaultAdmin() method
      await this.backendSDK.admin.createDefaultAdmin();
      const result = {
        success: true,
        message: "Default admin user created successfully",
        adminUser: {
          username: "admin",
          email: "admin@krapi.com",
        },
      };

      res.json({
        success: result.success,
        message: result.message,
        adminUser: result.adminUser,
      });
    } catch (error) {
      console.error("Create default admin error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create default admin",
      });
    }
  }
}


