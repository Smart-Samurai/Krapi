/**
 * Metadata Schema API Route
 * GET /api/krapi/k1/metadata/schema
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const _sdk = await createAuthenticatedBackendSdk(authToken);

    // Backend route exists but SDK might not have this method yet
    // Return basic schema structure for now
    return NextResponse.json({
      success: true,
      schema: {
        version: "1.0",
        fields: [],
        types: {},
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get metadata schema",
      },
      { status: 500 }
    );
  }
}
