import { krapi } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Database health check
 * GET /api/health/database
 */
export async function GET(_request: NextRequest) {
  try {
    const health = await krapi.health.checkDatabase();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        healthy: false,
        message: "Database health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

