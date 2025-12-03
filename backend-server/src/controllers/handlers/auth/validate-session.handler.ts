import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthAdapterService } from "@/services/auth-adapter.service";
import { ApiResponse } from "@/types";

/**
 * Handler for validating session
 * POST /krapi/k1/auth/session/validate
 */
export class ValidateSessionHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: "Token is required",
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
        // BackendSDK.auth doesn't have validateToken method
        // Use AuthAdapterService directly to validate session
        const authAdapter = AuthAdapterService.getInstance();
        const result = await authAdapter.validateSession(token);

        if (!result.valid || !result.user) {
          res.status(401).json({
            success: false,
            error: "Invalid or expired session",
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            valid: true,
            session: result.user,
          },
        } as ApiResponse);
      } catch (error) {
        res.status(401).json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Invalid or expired session",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  }
}








