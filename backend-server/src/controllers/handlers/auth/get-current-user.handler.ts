import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthAdapterService } from "@/services/auth-adapter.service";
import { ApiResponse } from "@/types";

/**
 * Handler for getting current user
 * GET /krapi/k1/auth/me
 */
export class GetCurrentUserHandler {
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

      const token = authHeader.substring(7);
      console.log("🔍 [AUTH DEBUG] getCurrentUser - Token extracted:", {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 10),
      });

      // BackendSDK.auth doesn't have validateToken/getCurrentUser methods
      // Use AuthAdapterService directly to validate session and get user
      console.log("🔍 [AUTH DEBUG] Validating token with AuthAdapterService");
      const authAdapter = AuthAdapterService.getInstance();
      const validationResult = await authAdapter.validateSession(token);

      if (!validationResult.valid || !validationResult.user) {
        console.error(
          "❌ [AUTH DEBUG] Token validation failed:",
          validationResult
        );
        res.status(401).json({
          success: false,
          error: "Invalid or expired session",
        } as ApiResponse);
        return;
      }

      // Use user from validation result
      console.log("✅ [AUTH DEBUG] getCurrentUser success:", {
        hasData: !!validationResult.user,
        userId: validationResult.user?.id,
        username: (validationResult.user as { username?: string })?.username,
      });

      // SDK expects Session object with user field: { success: true, data: { user: userObject } }
      res.status(200).json({
        success: true,
        data: {
          user: validationResult.user,
        },
      } as ApiResponse);
    } catch (error) {
      console.error("❌ [AUTH DEBUG] getCurrentUser error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Invalid or expired session";
      res.status(401).json({
        success: false,
        error: errorMessage,
      } as ApiResponse);
    }
  }
}





