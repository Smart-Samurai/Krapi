/**
 * System Encryption Key API Route
 * GET /api/krapi/k1/system/encryption-key
 *
 * Proxies to backend system encryption key endpoint.
 * SDK currently lacks a dedicated method, so we forward the request.
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const backendUrl = `${config.backend.url}/krapi/k1/system/encryption-key`;
    const response = await fetch(backendUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return NextResponse.json(
      data,
      { status: response.status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve encryption key",
      },
      { status: 500 }
    );
  }
}

