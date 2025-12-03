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
 * Get a user by ID in a project
 * GET /api/krapi/k1/projects/[projectId]/users/[userId]
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; userId: string }>;
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

    const { projectId, userId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const user = await sdk.users.get(projectId, userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // SDK HTTP client expects response.data to be the user
    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get user";

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
 * Update a user in a project
 * PUT /api/krapi/k1/projects/[projectId]/users/[userId]
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; userId: string }>;
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

    const { projectId, userId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    const updates = await request.json();

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const user = await sdk.users.update(projectId, userId, updates);

    // SDK HTTP client expects response.data to be the updated user
    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update user";

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
 * Delete a user from a project
 * DELETE /api/krapi/k1/projects/[projectId]/users/[userId]
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; userId: string }>;
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

    const { projectId, userId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    await sdk.users.delete(projectId, userId);

    // SDK HTTP client expects success response
    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete user";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

