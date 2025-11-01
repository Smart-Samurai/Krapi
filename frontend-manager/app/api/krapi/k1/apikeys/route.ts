/**
 * API Keys API Route
 * GET /api/krapi/k1/apikeys
 * POST /api/krapi/k1/apikeys
 */

import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const queryParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      queryParams.append(key, value);
    });

    const response = await fetch(
      `${backendUrl}/apikeys?${queryParams}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to get API keys" },
        { status: response.status }
      );
    }

    const apiKeysData = await response.json();
    return NextResponse.json(apiKeysData);
  } catch (error) {
    console.error("Get API keys error:", error);
    return NextResponse.json(
      { error: "Failed to get API keys" },
      { status: 500 }
    );
  }
}

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

    const response = await fetch(`${backendUrl}/apikeys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to create API key" },
        { status: response.status }
      );
    }

    const apiKeyData = await response.json();
    return NextResponse.json(apiKeyData);
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

