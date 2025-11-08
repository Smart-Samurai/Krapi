/**
 * File Upload API Route
 * POST /api/krapi/k1/storage/upload
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Call the backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const uploadUrl = `${backendUrl}/storage/upload`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to upload file",
        },
        { status: response.status }
      );
    }

    const uploadData = await response.json();
    return NextResponse.json({ success: true, data: uploadData });
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}
