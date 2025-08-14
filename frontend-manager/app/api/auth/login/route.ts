import { NextRequest, NextResponse } from "next/server";

import { serverSdk } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const client = serverSdk;
    const response = await client.auth.adminLogin({
      username: email,
      password,
    });

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 401 });
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
