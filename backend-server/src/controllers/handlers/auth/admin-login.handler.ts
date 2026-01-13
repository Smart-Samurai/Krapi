import { randomBytes } from "crypto";

import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { ApiResponse, BackendSession, SessionType } from "@/types";
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
        // If admin authentication fails, try project user authentication as fallback
        // This allows the SDK's auth.login() to work for both admin and project users
        console.log(`[ADMIN LOGIN] Admin authentication failed for ${username}, trying project user authentication...`);
        
        try {
          const { AuthAdapterService } = await import("@/services/auth-adapter.service");
          const authAdapter = AuthAdapterService.getInstance();
          const projectUser = await authAdapter.authenticateUser({
            username,
            password,
          });

          // Check if it's a project user (has project_id) vs admin user (has access_level)
          if (projectUser && "project_id" in projectUser && !("access_level" in projectUser)) {
            // Found a project user, create session
            console.log(`[ADMIN LOGIN] Project user ${username} authenticated successfully`);
            
            const projectUserData = projectUser as { id: string; project_id?: string; scopes?: string[] };
            
            // Create session directly using DatabaseService (same approach as users.controller.ts)
            const { DatabaseService } = await import("@/services/database.service");
            const db = DatabaseService.getInstance();
            
            const sessionToken = `st_${uuidv4().replace(/-/g, "")}${randomBytes(16).toString("hex")}`;
            const expiresAt = new Date(Date.now() + (remember_me ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)).toISOString();
            
            const sessionData: Omit<BackendSession, "id" | "createdAt" | "lastActivity"> = {
              token: sessionToken,
              user_id: projectUserData.id,
              type: SessionType.PROJECT,
              user_type: "project" as const,
              scopes: projectUserData.scopes || [],
              is_active: true,
              created_at: new Date().toISOString(),
              expires_at: expiresAt,
              consumed: false,
            };
            
            if (projectUserData.project_id) {
              sessionData.project_id = projectUserData.project_id;
            }
            const ipAddress = req.ip || req.socket.remoteAddress;
            if (ipAddress) {
              sessionData.ip_address = ipAddress;
            }
            const userAgent = req.get("user-agent");
            if (userAgent) {
              sessionData.user_agent = userAgent;
            }
            
            console.log(`[ADMIN LOGIN] Creating session for project user ${username} using DatabaseService...`);
            const session = await db.createSession(sessionData);
            console.log(`[ADMIN LOGIN] Session created successfully for project user ${username}, token: ${session.token.substring(0, 20)}...`);

            const responseData = {
              success: true,
              data: {
                user: projectUser,
                token: session.token,
                session_token: session.token,
                expires_at: session.expires_at,
                scopes: session.scopes || projectUserData.scopes || [],
              },
            };
            
            console.log(`[ADMIN LOGIN] Returning success response for project user ${username}`);
            res.status(200).json(responseData as ApiResponse);
            return;
          }
        } catch (projectUserError) {
          console.log(`[ADMIN LOGIN] Project user authentication also failed for ${username}:`, projectUserError instanceof Error ? projectUserError.message : String(projectUserError));
          // Fall through to return error
        }

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








