import { NextRequest, NextResponse } from "next/server";

import { krapi } from "@/lib/krapi";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const response = await krapi.auth.login(username, password);

    // Return the data in the format expected by the tests
    return NextResponse.json({
      success: true,
      session_token: response.session_token,
      user: response.user,
      expires_at: response.expires_at,
      scopes: response.scopes,
    });
  } catch (error) {
    // Error logged for debugging
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
