import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedSdk, getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; tableName: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const { projectId, tableName } = await params;
    const searchParams = request.nextUrl.searchParams;
    const options: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: "asc" | "desc";
      search?: string;
      filter?: Record<string, unknown>;
    } = {};

    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const sort = searchParams.get("sort");
    const order = searchParams.get("order");
    const search = searchParams.get("search");

    if (page) options.page = parseInt(page);
    if (limit) options.limit = parseInt(limit);
    if (sort) options.sort = sort;
    if (order) options.order = order as "asc" | "desc";
    if (search) options.search = search;

    const client = createAuthenticatedSdk(authToken);
    const response = await client.documents.getAll(
      projectId,
      tableName,
      options
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; tableName: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const { projectId, tableName } = await params;
    const body = await request.json();
    const client = createAuthenticatedSdk(authToken);
    const response = await client.documents.create(
      projectId,
      tableName,
      body.data
    );

    if (response.success) {
      return NextResponse.json(response, { status: 201 });
    } else {
      return NextResponse.json(response, { status: 400 });
    }
  } catch (error) {
    console.error("Create document error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
