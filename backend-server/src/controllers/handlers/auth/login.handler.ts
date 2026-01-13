import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { AuthAdapterService } from "@/services/auth-adapter.service";
import { ApiResponse, BackendSession } from "@/types";

/**
 * Handler for unified login (admin or project user)
 * POST /krapi/k1/auth/login
 * 
 * This endpoint handles login for both admin and project users.
 * It tries admin authentication first, then project user authentication.
 */
export class LoginHandler {
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
        console.log(`[LOGIN HANDLER] Attempting to authenticate user: ${username}`);
        // Use AuthAdapterService to authenticate (tries admin first, then project user)
        const authAdapter = AuthAdapterService.getInstance();
        console.log(`[LOGIN HANDLER] Calling AuthAdapterService.authenticateUser for: ${username}`);
        const user = await authAdapter.authenticateUser({
          username,
          password,
        });
        console.log(`[LOGIN HANDLER] AuthAdapterService.authenticateUser result: ${user ? `Found user (type: ${'role' in user ? 'admin' : 'project'})` : 'No user found'}`);

        if (!user) {
          res.status(401).json({
            success: false,
            error: "Invalid credentials",
          } as ApiResponse);
          return;
        }

        // Determine user type and scopes
        let userType: "admin" | "project" = "admin";
        let scopes: string[] = [];
        let projectId: string | undefined;

        if ("role" in user && "permissions" in user) {
          // Admin user
          userType = "admin";
          const authService = await import("@/services/auth.service").then(
            (m) => m.AuthService.getInstance()
          );
          scopes = authService
            .getScopesForRole(user.role)
            .map((scope) => scope.toString());
        } else {
          // Project user
          userType = "project";
          projectId = (user as { project_id?: string }).project_id;
          scopes = (user as { scopes?: string[] }).scopes || [];
        }

        // Create session using DatabaseService directly
        const { DatabaseService } = await import("@/services/database.service");
        const { SessionType } = await import("@/types");
        const db = DatabaseService.getInstance();
        
        // Generate secure token
        const crypto = await import("crypto");
        const sessionToken = `st_${crypto.randomBytes(32).toString("hex")}`;
        
        // Calculate expiration (24 hours default, or longer if remember_me)
        const expirationHours = remember_me ? 168 : 24; // 7 days if remember_me, else 24 hours
        const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();
        
        // Create session in database
        const sessionData: Omit<BackendSession, "id" | "createdAt" | "lastActivity"> = {
          token: sessionToken,
          type: userType === "admin" ? SessionType.ADMIN : SessionType.PROJECT,
          user_id: user.id,
          scopes,
          is_active: true,
          created_at: new Date().toISOString(),
          expires_at: expiresAt,
          consumed: false,
        };
        
        // Add optional fields only if they exist
        if (projectId) {
          sessionData.project_id = projectId;
        }
        const ipAddress = req.ip || req.socket.remoteAddress;
        if (ipAddress) {
          sessionData.ip_address = ipAddress;
        }
        const userAgent = req.get("user-agent");
        if (userAgent) {
          sessionData.user_agent = userAgent;
        }
        
        const session = await db.createSession(sessionData);

        // Return success response
        res.status(200).json({
          success: true,
          data: {
            user,
            token: session.token,
            session_token: session.token,
            expires_at: session.expires_at,
            scopes: session.scopes,
          },
        } as ApiResponse);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Invalid credentials";
        res.status(401).json({
          success: false,
          error: errorMessage,
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  }
}

