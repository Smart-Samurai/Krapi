import { NextRequest, NextResponse } from "next/server";

import { serverSdk } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        {
          success: false,
          error: "Current password and new password are required",
        },
        { status: 400 }
      );
    }

    const client = serverSdk;
    const response = await client.auth.changePassword(
      current_password,
      new_password
    );

    return NextResponse.json({
      success: response.success,
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
