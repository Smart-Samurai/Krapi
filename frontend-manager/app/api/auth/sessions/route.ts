import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Create a new session from an API key
 * POST /api/auth/sessions
 *
 * PROXY ROUTE: Connects to backend URL to create session from API key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // Use backend SDK client to create a session from the API key
    const backendSdk = await getBackendSdkClient();
    const session = await backendSdk.auth.createSession(api_key);

    return NextResponse.json(session);
  } catch (error) {
    // Error creating session from API key

    if (error instanceof Error) {
      if (error.message.includes("Invalid or expired API key")) {
        return NextResponse.json(
          { error: "Invalid or expired API key" },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
