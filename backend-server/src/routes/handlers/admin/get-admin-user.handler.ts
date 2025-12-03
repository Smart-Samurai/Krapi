import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting a single admin user
 * GET /admin/users/:userId
 */
export class GetAdminUserHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ success: false, error: "User ID is required" });
        return;
      }

      const user = await this.backendSDK.admin.getUserById(userId);

      if (!user) {
        res.status(404).json({ success: false, error: "Admin user not found" });
        return;
      }

      res.json({ success: true, data: user });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get admin user",
      });
    }
  }
}

