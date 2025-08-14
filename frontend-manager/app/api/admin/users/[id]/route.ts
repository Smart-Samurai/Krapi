import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedSdk, getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = createAuthenticatedSdk(authToken);
    const response = await client.admin.getUserById(id);

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 404 });
    }
  } catch (error) {
    // Error logged for debugging
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const client = createAuthenticatedSdk(authToken);
    const response = await client.admin.updateUser(id, body);

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 400 });
    }
  } catch (error) {
    // Error logged for debugging
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = createAuthenticatedSdk(authToken);
    const response = await client.admin.deleteUser(id);

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 400 });
    }
  } catch (error) {
    // Error logged for debugging
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
