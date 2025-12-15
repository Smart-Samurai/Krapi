/**
 * API Keys API Route
 * GET /api/krapi/k1/apikeys
 * POST /api/krapi/k1/apikeys
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id") || searchParams.get("projectId") || undefined;
    const limitParam = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offsetParam = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;
    const apiKeys = await sdk.apiKeys.getAll(projectId || "", { limit: limitParam, offset: offsetParam });

    return NextResponse.json(apiKeys);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting API keys:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get API keys" },
      { status: 500 }
    );
  }
}

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
    const projectId = body.projectId || body.project_id;
    const apiKey = await sdk.apiKeys.create(projectId || "", body);

    return NextResponse.json(apiKey);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create API key" },
      { status: 500 }
    );
  }
}

