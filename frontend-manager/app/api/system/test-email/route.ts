import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";

/**
 * Test email configuration
 * POST /api/system/test-email
 *
 * SDK 0.4.0+: Use email.testConfig(projectId, testEmail) instead of system.testEmailConfig()
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, projectId } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // SDK 0.4.0+: Use email.testConfig(projectId, testEmail)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.email.testConfig(projectId || "", email);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
