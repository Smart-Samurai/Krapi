import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { createErrorResponse, logApiError } from "@/app/api/lib/error-utils";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get all users in a project
 * GET /api/krapi/k1/projects/[projectId]/users
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
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit") || "100", 10) : undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page") || "1", 10) : undefined;

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const users = await sdk.users.getAll(projectId, { search, limit, page });

    // SDK HTTP client expects response.data to be the users array
    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logApiError("getUsers", error);
    return createErrorResponse(error, 500);
  }
}

/**
 * Create a new user in a project
 * POST /api/krapi/k1/projects/[projectId]/users
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

    const userData = await request.json();

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const user = await sdk.users.create(projectId, userData);

    // SDK HTTP client expects response.data to be the created user
    return NextResponse.json({
      success: true,
      data: user,
    }, { status: 201 });
  } catch (error) {
    logApiError("createUser", error);
    return createErrorResponse(error, 500);
  }
}
