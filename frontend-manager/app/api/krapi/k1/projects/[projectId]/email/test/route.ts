/**
 * Test Email Connection API Route
 * POST /api/krapi/k1/projects/[projectId]/email/test
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Test email connection for a project
 * POST /api/krapi/k1/projects/[projectId]/email/test
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  }
): Promise<Response> {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const testEmail = body.email || body.testEmail || "test@example.com";

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    
    // Use SDK email.testConfig method (which maps to testConnection in client mode)
    // testConfig(projectId, testEmail?) - testEmail is optional
    const result = await sdk.email.testConfig(projectId, testEmail);

    // SDK returns { success: boolean, data: { success: boolean, message: string } }
    // Frontend should return the same format
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error testing email connection:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to test email connection",
      },
      { status: 500 }
    );
  }
}

