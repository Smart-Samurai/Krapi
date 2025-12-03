import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for enabling an admin account
 * PUT /admin/users/:userId/enable
 * 
 * Uses SDK admin.updateUser() method to set active: true.
 */
export class EnableAdminAccountHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ success: false, error: "User ID is required" });
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      // Use SDK admin.updateUser() to enable account
      const user = await this.backendSDK.admin.updateUser(userId, { active: true });

      if (user) {
        res.json({ success: true, data: user, message: "Admin account enabled successfully" });
      } else {
        res.status(404).json({ success: false, error: "Admin account not found" });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to enable admin account",
      });
    }
  }
}

