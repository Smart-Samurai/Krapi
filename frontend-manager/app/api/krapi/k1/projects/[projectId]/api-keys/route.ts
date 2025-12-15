import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get API keys for a project
 * GET /api/krapi/k1/projects/[projectId]/api-keys
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit") || "100", 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset") || "0", 10) : undefined;

    const sdk = await createAuthenticatedBackendSdk(authToken);
    // Use apiKeys.getAll which works in server mode (backend SDK)
    const keys = await sdk.apiKeys.getAll(projectId, { limit, offset });

    // SDK HTTP client expects response.data to be the keys array
    return NextResponse.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get API keys";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Create API key for a project
 * POST /api/krapi/k1/projects/[projectId]/api-keys
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
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, scopes, expires_at } = body;

    // SDK-FIRST: Use SDK apiKeys.create() method
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const apiKey = await sdk.apiKeys.create(projectId, {
      name: name || "Project API Key",
      scopes: scopes || ["projects:read", "collections:read"],
      expires_at: expires_at,
    });

    return NextResponse.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create API key";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

