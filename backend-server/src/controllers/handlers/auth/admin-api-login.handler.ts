import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";

/**
 * Handler for admin API login
 * POST /krapi/k1/auth/admin/api-login
 */
export class AdminApiLoginHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { api_key } = req.body;

      if (!api_key) {
        res.status(400).json({
          success: false,
          error: "API key is required",
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
        // Use SDK auth.createSession method for admin API login
        const authService = this.backendSDK.auth as unknown as {
          createSession: (apiKey: string) => Promise<{
            session_token: string;
            expires_at: string;
            user_type: "admin" | "project";
            scopes: string[];
          }>;
        };
        const result = await authService.createSession(api_key);

        // Return success response
        res.status(200).json({
          success: true,
          data: {
            session_token: result.session_token,
            expires_at: result.expires_at,
            scopes: result.scopes,
            user_type: result.user_type,
          },
        } as ApiResponse);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Invalid or inactive API key";
        res.status(401).json({
          success: false,
          error: errorMessage,
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Admin API login error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  }
}








