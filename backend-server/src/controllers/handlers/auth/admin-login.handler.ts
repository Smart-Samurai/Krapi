import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";
import { extractErrorDetails, logError, isAuthError } from "@/utils/error-utils";

/**
 * Handler for admin login
 * POST /krapi/k1/auth/admin/login
 */
export class AdminLoginHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, remember_me } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: "Username and password are required",
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
        // Use SDK auth.authenticateAdmin method
        const authService = this.backendSDK.auth as unknown as {
          authenticateAdmin: (credentials: {
            username: string;
            password: string;
            remember_me?: boolean;
          }) => Promise<{
            success: boolean;
            token: string;
            expires_at: string;
            user: {
              id: string;
              username: string;
              email: string;
              role: string;
              access_level: string;
              permissions: string[];
              active: boolean;
            };
            scopes: string[];
            session_id: string;
          }>;
        };

        console.log(
          "🔍 [AUTH DEBUG] Calling SDK authenticateAdmin for username:",
          username
        );

        // Authenticate admin user - SDK creates session automatically
        const authResult = await authService.authenticateAdmin({
          username,
          password,
          remember_me,
        });

        console.log("🔍 [AUTH DEBUG] SDK authenticateAdmin result:", {
          success: authResult?.success,
          hasToken: !!authResult?.token,
          tokenLength: authResult?.token?.length,
          hasUser: !!authResult?.user,
          userId: authResult?.user?.id,
          scopes: authResult?.scopes,
          sessionId: authResult?.session_id,
        });

        if (!authResult || !authResult.success) {
          console.error(
            "❌ [AUTH DEBUG] Authentication failed - no result or success=false"
          );
          throw new Error("Invalid credentials");
        }

        if (!authResult.token) {
          console.error(
            "❌ [AUTH DEBUG] Authentication succeeded but no token in result"
          );
          throw new Error("Session creation failed - no token returned");
        }

        const responseData = {
          success: true,
          data: {
            user: authResult.user,
            token: authResult.token,
            session_token: authResult.token,
            expires_at: authResult.expires_at,
            scopes: authResult.scopes,
          },
        };

        console.log(
          "✅ [AUTH DEBUG] Returning success response with session_token"
        );

        res.status(200).json(responseData as ApiResponse);
      } catch (error) {
        // Use SDK error utilities for detailed error extraction
        const errorDetails = extractErrorDetails(error);
        logError("adminLogin.authenticate", error);

        // Log failed login attempt with SDK error details
        console.warn(
          `Failed login attempt for username: ${username} from IP: ${req.ip}`,
          { code: errorDetails.code, status: errorDetails.status }
        );

        res.status(isAuthError(error) ? 401 : errorDetails.status).json({
          success: false,
          error: errorDetails.message || "Invalid credentials",
          code: errorDetails.code,
        } as ApiResponse);
      }
    } catch (error) {
      const errorDetails = extractErrorDetails(error);
      logError("adminLogin", error);
      
      res.status(errorDetails.status).json({
        success: false,
        error: errorDetails.message || "Internal server error",
        code: errorDetails.code,
      } as ApiResponse);
    }
  }
}








