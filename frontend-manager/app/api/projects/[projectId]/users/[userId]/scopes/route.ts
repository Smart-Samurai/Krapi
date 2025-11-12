import { NextRequest, NextResponse } from "next/server";

import { getAuthToken, serverSdk } from "@/app/api/lib/sdk-client";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Update project user scopes
 * PUT /api/projects/[projectId]/users/[userId]/scopes
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

    const { scopes } = await request.json();

    if (!Array.isArray(scopes)) {
      return NextResponse.json(
        { success: false, error: "Scopes must be an array" },
        { status: 400 }
      );
    }

    // Use SDK instead of direct fetch
    // Update user with permissions field set to scopes
    serverSdk.auth.setSessionToken(authToken);
    const user = await serverSdk.users.update(projectId, userId, {
      permissions: scopes,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update user scopes",
      },
      { status: 500 }
    );
  }
}
