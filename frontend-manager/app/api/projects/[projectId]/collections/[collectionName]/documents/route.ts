import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

// UUID validation function - more permissive to accept any valid UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get documents from a collection
 * GET /api/projects/[projectId]/collections/[collectionName]/documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; collectionName: string }> }
): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId, collectionName } = await params;

    // Validate UUID format before making backend call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!collectionName) {
      return NextResponse.json(
        { success: false, error: "Collection name is required" },
        { status: 400 }
      );
    }

    // Call the backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : 1;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : 0;
    const countOnly = searchParams.get("count") === "true";

    // Parse filter parameters
    let filter: Record<string, string> | undefined = undefined;
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter[")) {
        if (!filter) filter = {};
        const fieldName = key.slice(7, -1); // Remove "filter[" and "]"
        filter[fieldName] = value;
      }
    }

    // If count only is requested, return count instead of documents
    if (countOnly) {
      const countUrl = `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/count`;

      // Build query parameters for filtering
      const countParams = new URLSearchParams();
      if (filter) {
        for (const [key, value] of Object.entries(filter)) {
          if (typeof value === "string") {
            countParams.append(`filter[${key}]`, value);
          }
        }
      }

      const fullCountUrl = countParams.toString()
        ? `${countUrl}?${countParams.toString()}`
        : countUrl;

      const countResponse = await fetch(fullCountUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!countResponse.ok) {
        const errorData = await countResponse.json();
        return NextResponse.json(
          {
            success: false,
            error: errorData.error || "Failed to count documents",
          },
          { status: countResponse.status }
        );
      }

      const countData = await countResponse.json();
      return NextResponse.json({ success: true, data: countData });
    }

    // Regular document fetching
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      page: page.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(
      `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}/documents?${queryParams}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to fetch documents",
        },
        { status: response.status }
      );
    }

    const documents = await response.json();
    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch documents",
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new document in a collection
 * POST /api/projects/[projectId]/collections/[collectionName]/documents
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; collectionName: string }> }
): Promise<Response> {
  try {
    console.log("🔍 [FRONTEND DOCUMENTS] POST request received");

    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      console.log("❌ [FRONTEND DOCUMENTS] No auth token found");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId, collectionName } = await params;
    console.log(
      `🔍 [FRONTEND DOCUMENTS] Project: ${projectId}, Collection: ${collectionName}`
    );

    // Validate UUID format before making backend call
    if (!isValidUUID(projectId)) {
      console.log("❌ [FRONTEND DOCUMENTS] Invalid project ID format");
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!collectionName) {
      console.log("❌ [FRONTEND DOCUMENTS] Collection name missing");
      return NextResponse.json(
        { success: false, error: "Collection name is required" },
        { status: 400 }
      );
    }

    const documentData = await request.json();
    console.log(`🔍 [FRONTEND DOCUMENTS] Document data:`, documentData);

    if (!documentData.data) {
      console.log("❌ [FRONTEND DOCUMENTS] Document data missing");
      return NextResponse.json(
        { success: false, error: "Document data is required" },
        { status: 400 }
      );
    }

    // Call the backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const fullBackendUrl = `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}/documents`;
    console.log(`🔍 [FRONTEND DOCUMENTS] Calling backend: ${fullBackendUrl}`);

    const response = await fetch(fullBackendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(documentData),
    });

    console.log(
      `🔍 [FRONTEND DOCUMENTS] Backend response status: ${response.status}`
    );

    // Log response body for debugging
    const responseText = await response.text();
    console.log(`🔍 [FRONTEND DOCUMENTS] Backend response body:`, responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText };
      }
      console.log(`❌ [FRONTEND DOCUMENTS] Backend error:`, errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to create document",
        },
        { status: response.status }
      );
    }

    const document = JSON.parse(responseText);
    console.log(`✅ [FRONTEND DOCUMENTS] Document created:`, document);
    return NextResponse.json(
      { success: true, data: document },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create document",
      },
      { status: 500 }
    );
  }
}
