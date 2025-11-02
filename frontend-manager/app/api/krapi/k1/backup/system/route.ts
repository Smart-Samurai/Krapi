/**
 * Create System Backup API Route
 * POST /api/krapi/k1/backup/system
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";

    const response = await fetch(`${backendUrl}/krapi/k1/backup/system`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to create system backup",
        },
        { status: response.status }
      );
    }

    const backupData = await response.json();
    return NextResponse.json(backupData);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create system backup",
      },
      { status: 500 }
    );
  }
}
