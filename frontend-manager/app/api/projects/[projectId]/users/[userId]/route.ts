import { NextRequest, NextResponse } from "next/server";

import { getAuthToken, serverSdk } from "@/app/api/lib/sdk-client";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get a specific project user
 * GET /api/projects/[projectId]/users/[userId]
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

    // Use SDK instead of direct fetch
    serverSdk.auth.setSessionToken(authToken);
    const user = await serverSdk.users.get(projectId, userId);

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    // Check if it's an Axios error with a status code
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "status" in error.response &&
      typeof error.response.status === "number"
    ) {
      const status = error.response.status as number;
      const response = error.response as { status: number; data?: { error?: string; success?: boolean } };
      const errorData = response.data;
      
      return NextResponse.json(
        {
          success: false,
          error: errorData?.error || (error instanceof Error ? error.message : "Failed to fetch project user"),
        },
        { status }
      );
    }
    
    // Check if error has a status property directly (SDK might set this)
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof error.status === "number"
    ) {
      const status = error.status as number;
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch project user";
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status }
      );
    }
    
    // Check error message for status code hints (e.g., "not found" = 404)
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes("not found") || errorMessage.includes("does not exist")) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch project user",
      },
      { status: 500 }
    );
  }
}

/**
 * Update a project user
 * PUT /api/projects/[projectId]/users/[userId]
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

    const userData = await request.json();

    // Use SDK instead of direct fetch
    serverSdk.auth.setSessionToken(authToken);
    const user = await serverSdk.users.update(projectId, userId, userData);

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update project user",
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a project user
 * DELETE /api/projects/[projectId]/users/[userId]
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

    // Use SDK instead of direct fetch
    serverSdk.auth.setSessionToken(authToken);
    await serverSdk.users.delete(projectId, userId);

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete project user",
      },
      { status: 500 }
    );
  }
}

