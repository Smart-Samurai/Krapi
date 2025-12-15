import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";

/**
 * Handler for logout
 * POST /krapi/k1/auth/logout
 */
export class LogoutHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // Get the session token from the request headers
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          error: "No valid session token provided",
        } as ApiResponse);
        return;
      }

      try {
        // Use SDK auth.logout method
        const authService = this.backendSDK.auth as unknown as {
          logout: () => Promise<{
            success: boolean;
          }>;
        };
        const result = await authService.logout();

        res.status(200).json({
          success: result.success,
          data: undefined,
        } as ApiResponse);
      } catch (error) {
        res.status(401).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to logout",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  }
}








