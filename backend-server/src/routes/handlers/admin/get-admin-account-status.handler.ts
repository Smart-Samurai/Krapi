import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for getting admin account status
 * GET /admin/users/:userId/status
 * 
 * Uses SDK admin.getUserById() method to get user status.
 */
export class GetAdminAccountStatusHandler {
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

      // Use SDK admin.getUserById() to get user status
      const user = await this.backendSDK.admin.getUserById(userId);

      if (user) {
        res.json({
          success: true,
          data: {
            id: user.id,
            username: user.username,
            active: user.active,
            role: user.role,
            access_level: user.access_level,
            last_login: user.last_login,
            login_count: user.login_count,
          },
        });
      } else {
        res.status(404).json({ success: false, error: "Admin account not found" });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get admin account status",
      });
    }
  }
}

