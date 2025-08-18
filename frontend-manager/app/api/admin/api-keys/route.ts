import { NextRequest, NextResponse } from "next/server";

import { krapi } from "@/lib/krapi";

export async function GET(_request: NextRequest) {
  try {
    // For now, return empty list since admin API keys are not fully implemented
    return NextResponse.json({
      success: true,
      data: [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, permissions, expires_at } = body;

    if (!name || !permissions) {
      return NextResponse.json(
        { success: false, error: "Name and permissions are required" },
        { status: 400 }
      );
    }

    // Get the current user from the session to determine who's creating the API key
    // For now, we'll use a system user ID since this is admin functionality
    const systemUserId = "system";

    // Use the SDK to create a real API key
    const apiKey = await krapi.admin.createApiKey(systemUserId, {
      name,
      permissions,
      expires_at,
    });

    return NextResponse.json(
      {
        success: true,
        key: apiKey.key,
        data: apiKey.data,
      },
      { status: 201 }
    );
  } catch (error) {
    // Error creating API key
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
