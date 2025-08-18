import { NextRequest, NextResponse } from "next/server";

import { serverSdk, getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    // Use the serverSdk directly since it's already connected
    const client = serverSdk;
    const user = await client.auth.getCurrentUser();

    if (user) {
      return NextResponse.json({
        success: true,
        ...user
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "User not found"
      }, { status: 401 });
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
