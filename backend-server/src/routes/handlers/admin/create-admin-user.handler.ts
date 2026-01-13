import { BackendSDK } from "@smartsamurai/krapi-sdk";
import bcrypt from "bcryptjs";
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
      
      // If password is provided, hash it before passing to SDK
      // SDK might not handle password hashing, so we do it here
      if (userData.password && !userData.password_hash) {
        userData.password_hash = await bcrypt.hash(userData.password, 10);
        // Remove password field - SDK should only receive password_hash
        delete userData.password;
      }
      
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

