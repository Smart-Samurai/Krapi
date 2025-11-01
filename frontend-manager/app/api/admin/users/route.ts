import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedSdk, getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const options: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: "asc" | "desc";
      search?: string;
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
    const response = await client.admin.getAllUsers(options);
    const result = response as unknown as { success: boolean; data?: unknown; error?: string };

    return NextResponse.json(result);
  } catch (error) {
    // Error logged for debugging
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const client = createAuthenticatedSdk(authToken);
    const response = await client.admin.createUser(body);
    const result = response as unknown as { success: boolean; data?: unknown; error?: string };

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    // Error logged for debugging
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
