import { krapi } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Run integration tests
 * POST /api/testing/run-tests
 */
export async function POST(_request: NextRequest) {
  try {
    const results = await krapi.testing.runTests();
    return NextResponse.json(results);
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
