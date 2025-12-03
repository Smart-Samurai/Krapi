/**
 * API Key Details API Route
 * GET /api/krapi/k1/apikeys/[keyId]
 * DELETE /api/krapi/k1/apikeys/[keyId]
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { keyId } = resolvedParams;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const apiKey = await sdk.apiKeys.get("", keyId);

    return NextResponse.json(apiKey);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting API key:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get API key details" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { keyId } = resolvedParams;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    await sdk.apiKeys.delete("", keyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete API key" },
      { status: 500 }
    );
  }
}

