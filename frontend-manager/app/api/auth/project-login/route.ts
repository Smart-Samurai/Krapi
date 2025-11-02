import { NextRequest, NextResponse } from "next/server";

import { krapi } from "@/lib/krapi";

/**
 * Project user login
 * POST /api/auth/project-login
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

    // Use the SDK to authenticate project user
    const response = await krapi.auth.login(username, password, remember_me);

    return NextResponse.json({
      success: true,
      session_token: response.session_token,
      expires_at: response.expires_at,
      user: response.user,
      scopes: response.scopes,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      },
      { status: 401 }
    );
  }
}

