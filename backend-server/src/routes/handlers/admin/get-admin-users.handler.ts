import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response } from "express";

/**
 * Handler for getting all admin users
 * GET /admin/users
 */
export class GetAdminUsersHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: unknown, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const users = await this.backendSDK.admin.getUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get admin users",
      });
    }
  }
}

