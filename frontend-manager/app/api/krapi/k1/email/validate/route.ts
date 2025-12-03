/**
 * Email Validation API Route
 * POST /api/krapi/k1/email/validate
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await (sdk.email as unknown as {
      validate: (email: string) => Promise<{ valid: boolean; reason?: string }>;
    }).validate(body.email || body.address);

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error validating email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to validate email" },
      { status: 500 }
    );
  }
}

