import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

/**
 * Handler for creating an admin user
 * POST /admin/users
 */
export class CreateAdminUserHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({ success: false, error: "BackendSDK not initialized" });
        return;
      }

      const userData = req.body;
      const user = await this.backendSDK.admin.createUser(userData);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create admin user",
      });
    }
  }
}

