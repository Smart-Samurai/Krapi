import { krapi } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * System health check
 * GET /api/health/check
 */
export async function GET(_request: NextRequest) {
  try {
    const health = await krapi.health.check();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        healthy: false,
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

