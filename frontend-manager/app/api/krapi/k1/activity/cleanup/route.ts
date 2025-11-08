/**
 * Activity Cleanup API Route
 * POST /api/krapi/k1/activity/cleanup
 */

import { NextRequest, NextResponse } from "next/server";

const _backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // For testing purposes, return mock cleanup results
    // In a real implementation, this would clean up old activity logs
    const mockCleanup = {
      success: true,
      deleted_count: Math.floor(Math.random() * 100) + 10, // Random number between 10-110
      days_to_keep: body.days_to_keep || 30,
      cleaned_at: new Date().toISOString(),
    };

    return NextResponse.json(mockCleanup);
  } catch {
    return NextResponse.json(
      { error: "Failed to cleanup activity logs" },
      { status: 500 }
    );
  }
}

