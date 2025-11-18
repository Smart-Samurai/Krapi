import { krapi } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Test email configuration
 * POST /api/system/test-email
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, emailConfig } = body;

    if (!email || !emailConfig) {
      return NextResponse.json(
        { success: false, error: "Email and email config are required" },
        { status: 400 }
      );
    }

    const result = await krapi.system.testEmailConfig(emailConfig);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

