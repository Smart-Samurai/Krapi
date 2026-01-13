import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Project user login
 * POST /api/auth/project-login
 *
 * PROXY ROUTE: Connects to backend URL to authenticate project user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, username, password, remember_me } = body;

    if (!project_id || !username || !password) {
      return NextResponse.json(
        { error: "Project ID, username, and password are required" },
        { status: 400 }
      );
    }

    // Use backend SDK client to authenticate project user
    const backendSdk = await getBackendSdkClient();
    const response = await backendSdk.auth.login(username, password, remember_me);

    return NextResponse.json({
      success: true,
      session_token: response.session_token,
      expires_at: response.expires_at,
      user: response.user,
      scopes: response.scopes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      },
      { status: 401 }
    );
  }
}

