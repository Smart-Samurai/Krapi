import { NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";

/**
 * Frontend Health Check
 * GET /api/health
 *
 * This route checks the health of the frontend application.
 * Note: According to architecture rules, all operations should go through SDK.
 * This health check only verifies frontend status.
 */
export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const frontendHealth = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      frontend: {
        status: "running",
        uptime: process.uptime(),
        environment: config.isDevelopment ? "development" : "production",
        port: config.ports.current,
        url: config.frontend.url,
      },
      sdk: {
        available: true,
        note: "All operations use SDK exclusively (client mode for frontend)",
      },
    };

    return NextResponse.json(frontendHealth);
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
