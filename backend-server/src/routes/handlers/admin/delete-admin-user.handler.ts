import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for deleting an admin user
 * DELETE /admin/users/:userId
 */
export class DeleteAdminUserHandler {
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

      const success = await this.backendSDK.admin.deleteUser(userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Admin user not found" });
        return;
      }

      res.json({ success: true, message: "Admin user deleted successfully" });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete admin user",
      });
    }
  }
}

