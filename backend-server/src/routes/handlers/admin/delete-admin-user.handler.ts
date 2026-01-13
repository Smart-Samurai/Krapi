import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for deleting an admin user
 * DELETE /admin/users/:userId
 */
export class DeleteAdminUserHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      if (!userId) {
        res.status(400).json({ success: false, error: "User ID is required" });
        return;
      }

      // Check if user being deleted is the default admin user
      const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
      const user = await this.backendSDK.admin.getUserById(userId);

      if (user && user.username === defaultUsername) {
        res.status(403).json({
          success: false,
          error: "Cannot delete default admin user",
          message: `The default admin user (username: "${defaultUsername}") cannot be deleted for security reasons.`,
        });
        return;
      }

      const success = await this.backendSDK.admin.deleteUser(userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Admin user not found" });
        return;
      }

      res.json({ success: true, message: "Admin user deleted successfully" });
    } catch (error) {
      // If getUserById fails (user doesn't exist), still try to delete (will return 404 if not found)
      if (error && (error as Error).message && (error as Error).message.includes("not found")) {
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
        return;
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete admin user",
      });
    }
  }
}

