import { NextRequest, NextResponse } from "next/server";

import { getAuthToken, getServerSdk } from "@/app/api/lib/sdk-client";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    // Validate UUID format
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const userData = await request.json();

    // Use SDK instead of direct fetch
    const sdk = await getServerSdk();
    sdk.auth.setSessionToken(authToken);
    const user = await sdk.users.create(projectId, userData);

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating project user:", error);
    
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
          error: errorData?.error || (error instanceof Error ? error.message : "Failed to create project user"),
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
      const errorMessage = error instanceof Error ? error.message : "Failed to create project user";
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status }
      );
    }
    
    // Check error message for status code hints (e.g., "already exists" = 409)
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create project user",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    // Validate UUID format
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Get search query parameter if provided
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    // Use SDK instead of direct fetch
    const sdk = await getServerSdk();
    sdk.auth.setSessionToken(authToken);
    const users = await sdk.users.getAll(projectId, {
      search,
      limit,
    });

    return NextResponse.json({ success: true, data: Array.isArray(users) ? users : [] });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching project users:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch project users",
      },
      { status: 500 }
    );
  }
}
