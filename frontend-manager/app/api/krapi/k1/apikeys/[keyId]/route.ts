/**
 * API Key Details API Route
 * GET /api/krapi/k1/apikeys/[keyId]
 * DELETE /api/krapi/k1/apikeys/[keyId]
 */

import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const response = await fetch(`${backendUrl}/apikeys/${params.keyId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to get API key details" },
        { status: response.status }
      );
    }

    const apiKeyData = await response.json();
    return NextResponse.json(apiKeyData);
  } catch (error: unknown) {
    
    return NextResponse.json(
      { error: "Failed to get API key details" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const response = await fetch(`${backendUrl}/apikeys/${params.keyId}`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to delete API key" },
        { status: response.status }
      );
    }

    const deleteData = await response.json();
    return NextResponse.json(deleteData);
  } catch (error: unknown) {
    
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}

