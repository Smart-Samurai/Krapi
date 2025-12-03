import { NextRequest, NextResponse } from "next/server";

import {
  createAuthenticatedBackendSdk,
  getBackendSdkClient,
} from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Auth API Routes (Legacy - Use /api/krapi/k1/auth/* routes instead)
 *
 * POST /api/auth?action=login - User login (deprecated, use /api/krapi/k1/auth/admin/login)
 * POST /api/auth?action=register - User registration
 * POST /api/auth?action=logout - User logout (deprecated, use /api/krapi/k1/auth/logout)
 * 
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: "Action parameter is required (login, register, logout)",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    switch (action) {
      case "login":
        if (!body.username || !body.password) {
          return NextResponse.json(
            { success: false, error: "Username and password are required" },
            { status: 400 }
          );
        }

        // SDK-FIRST: Use backend SDK client for login
        const loginSdk = await getBackendSdkClient();
        const session = await loginSdk.auth.login(body.username, body.password, body.remember_me);
        return NextResponse.json(session);

      case "register":
        if (!body.username || !body.email || !body.password) {
          return NextResponse.json(
            {
              success: false,
              error: "Username, email, and password are required",
            },
            { status: 400 }
          );
        }

        // SDK-FIRST: Use backend SDK client for registration
        const registerSdk = await getBackendSdkClient();
        const user = await registerSdk.auth.register({
          username: body.username,
          email: body.email,
          password: body.password,
        });
        return NextResponse.json(
          { success: true, data: user },
          { status: 201 }
        );

      case "logout":
        // SDK-FIRST: Use backend SDK client for logout
        const authToken = getAuthToken(request.headers);
        if (!authToken) {
          return NextResponse.json(
            { success: false, error: "Authentication required" },
            { status: 401 }
          );
        }
        const logoutSdk = await createAuthenticatedBackendSdk(authToken);
        await logoutSdk.auth.logout();
        return NextResponse.json({
          success: true,
          message: "Logged out successfully",
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action. Use: login, register, or logout",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      },
      { status: 500 }
    );
  }
}
