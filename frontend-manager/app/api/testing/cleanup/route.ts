import { krapi } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cleanup test data
 * POST /api/testing/cleanup
 */
export async function POST(_request: NextRequest) {
  try {
    const result = await krapi.testing.cleanup();
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

