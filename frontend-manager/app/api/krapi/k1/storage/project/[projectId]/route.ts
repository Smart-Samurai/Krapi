/**
 * List Files in Project API Route
 * GET /api/krapi/k1/storage/project/[projectId]
 */

import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const response = await fetch(`${backendUrl}/storage/project/${params.projectId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to list files" },
        { status: response.status }
      );
    }

    const filesData = await response.json();
    return NextResponse.json(filesData);
  } catch (error: unknown) {
    
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}

