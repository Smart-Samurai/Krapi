import { NextRequest, NextResponse } from "next/server";

import { krapi } from "@/lib/krapi";

/**
 * Get system health status
 * GET /api/health
 */
export async function GET(_request: NextRequest) {
  try {
    // Use the SDK to get health status
    const health = await krapi.health.check();

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

