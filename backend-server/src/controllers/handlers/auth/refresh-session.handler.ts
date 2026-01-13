import crypto from "crypto";

import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthService } from "@/services/auth.service";
import { DatabaseService } from "@/services/database.service";
import { ApiResponse, BackendSession } from "@/types";

/**
 * Handler for refreshing session
 * POST /krapi/k1/auth/refresh
 * 
 * Refreshes a session by creating a new session with extended expiration.
 * The current session is validated (already done by authenticate middleware),
 * then a new session is created with the same user/scopes but new expiration.
 */
export class RefreshSessionHandler {
  constructor(_backendSDK: BackendSDK) {
    // BackendSDK not needed for refresh - we use AuthService and DatabaseService directly
  }

  async handle(req: Request, res: Response): Promise<void> {
    try {
      // Get the session token from the request headers
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          error: "No valid session token provided",
        } as ApiResponse);
        return;
      }

      const currentToken = authHeader.substring(7);

      // Get services
      const authService = AuthService.getInstance();
      const db = DatabaseService.getInstance();

      // Validate current session and get session details
      const validationResult = await authService.validateSessionToken(currentToken);
      
      if (!validationResult.valid || !validationResult.session) {
        res.status(401).json({
          success: false,
          error: "Invalid or expired session",
        } as ApiResponse);
        return;
      }

      const currentSession = validationResult.session;

      // Create new session with extended expiration (24 hours from now)
      const newToken = `st_${crypto.randomBytes(32).toString("hex")}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      // Build session data - only include project_id if it exists
      const sessionData: Omit<BackendSession, "id" | "createdAt" | "lastActivity"> = {
        token: newToken,
        type: currentSession.type,
        user_id: currentSession.user_id,
        scopes: currentSession.scopes || [],
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        consumed: false,
        metadata: currentSession.metadata || {},
        ...(currentSession.project_id ? { project_id: currentSession.project_id } : {}),
      };

      const newSession = await db.createSession(sessionData);

      // Optionally mark old session as consumed (optional - can keep both active)
      // await db.updateSession(currentToken, { consumed: true });

      // SDK refreshSession expects response in { success: true, data: { session_token, expires_at } } format
      // The SDK HTTP client unwraps the data field
      res.status(200).json({
        success: true,
        data: {
          session_token: newSession.token,
          expires_at: newSession.expires_at,
        },
      });
    } catch (error) {
      console.error("Refresh session error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  }
}








