import { NextRequest, NextResponse } from "next/server";

import { getClientSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * CLIENT ROUTE: Database Health Check
 * 
 * GET /api/client/krapi/k1/health/database
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const clientSdk = await getClientSdkClient();
    const health = await clientSdk.health.checkDatabase();

    return NextResponse.json({
      success: true,
      ...health,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Database health check failed",
      },
      { status: 500 }
    );
  }
}










