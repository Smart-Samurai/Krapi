import { BackendSDK } from "@smartsamurai/krapi-sdk";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";

/**
 * Handler for updating an admin user
 * PUT /admin/users/:userId
 */
export class UpdateAdminUserHandler {
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

      const updates = req.body;
      
      // If password is provided, hash it before passing to SDK
      if (updates.password && !updates.password_hash) {
        updates.password_hash = await bcrypt.hash(updates.password, 10);
        // Remove password field - SDK should only receive password_hash
        delete updates.password;
      }
      
      const user = await this.backendSDK.admin.updateUser(userId, updates);

      if (!user) {
        res.status(404).json({ success: false, error: "Admin user not found" });
        return;
      }

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update admin user",
      });
    }
  }
}

