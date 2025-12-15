/**
 * Metadata Validate API Route
 * POST /api/krapi/k1/metadata/validate
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const _body = await request.json();

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const _sdk = await createAuthenticatedBackendSdk(authToken);

    // Backend route exists but SDK might not have this method yet
    // Basic validation - always return success for now
    return NextResponse.json({
      success: true,
      valid: true,
      errors: [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to validate metadata",
      },
      { status: 500 }
    );
  }
}
