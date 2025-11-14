import { krapi } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Run system diagnostics
 * POST /api/health/diagnostics
 */
export async function POST(_request: NextRequest) {
  try {
    const diagnostics = await krapi.health.runDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Diagnostics failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

