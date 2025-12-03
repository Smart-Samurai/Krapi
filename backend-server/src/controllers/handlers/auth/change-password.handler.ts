import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";

/**
 * Handler for changing password
 * POST /krapi/k1/auth/change-password
 */
export class ChangePasswordHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        res.status(400).json({
          success: false,
          error: "Current password and new password are required",
        } as ApiResponse);
        return;
      }

      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      try {
        // Use SDK auth.changePassword method
        const authService = this.backendSDK.auth as unknown as {
          changePassword: (
            oldPassword: string,
            newPassword: string
          ) => Promise<{
            success: boolean;
          }>;
        };
        const result = await authService.changePassword(
          current_password,
          new_password
        );

        if (!result.success) {
          res.status(400).json({
            success: false,
            error: "Failed to change password",
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          message: "Password changed successfully",
        } as ApiResponse);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to change password";
        // Check if it's a password validation error
        if (
          errorMessage.includes("incorrect") ||
          errorMessage.includes("invalid")
        ) {
          res.status(400).json({
            success: false,
            error: errorMessage,
          } as ApiResponse);
        } else {
          res.status(500).json({
            success: false,
            error: errorMessage,
          } as ApiResponse);
        }
      }
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  }
}








