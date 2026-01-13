import { NextRequest, NextResponse } from "next/server";

import { getClientSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * CLIENT ROUTE: Create Session from API Key (Legacy /api/auth/sessions)
 * 
 * POST /api/client/auth/sessions
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { api_key } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // CLIENT ROUTE: Use SDK to connect to frontend URL and call proxy route
    const clientSdk = await getClientSdkClient();
    const session = await clientSdk.auth.createSession(api_key);

    return NextResponse.json(session);
  } catch (error) {
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










