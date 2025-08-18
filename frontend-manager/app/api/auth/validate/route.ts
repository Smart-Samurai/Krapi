import { NextRequest, NextResponse } from "next/server";

import { serverSdk } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const client = serverSdk;
    try {
      const response = await client.auth.validateSession(token);

      return NextResponse.json({
        success: true,
        valid: response.valid,
        user: response.session || null,
      });
    } catch {
      // If the SDK method fails, return a proper error response
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "Invalid or expired session token",
        },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
