import { NextRequest, NextResponse } from "next/server";
import { createBackendClient, getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const client = createBackendClient(authToken);
    const resolvedParams = await params;
    const response = await client.collections.getAll(resolvedParams.projectId);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get schemas error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const client = createBackendClient(authToken);
    const resolvedParams = await params;
    const response = await client.collections.create(resolvedParams.projectId, body);

    if (response.success) {
      return NextResponse.json(response, { status: 201 });
    } else {
      return NextResponse.json(response, { status: 400 });
    }
  } catch (error) {
    console.error("Create schema error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
