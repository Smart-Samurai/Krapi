import { NextRequest, NextResponse } from "next/server";

import { krapi } from "@/lib/krapi";

/**
 * Repair database and fix issues
 * POST /api/health/repair
 */
export async function POST(_request: NextRequest) {
  try {
    // Use the SDK to run auto-repair
    const repairResult = await krapi.health.autoFix();

    return NextResponse.json(repairResult);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: "Database repair failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

