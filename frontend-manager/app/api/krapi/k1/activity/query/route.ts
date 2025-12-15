import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Query activity logs
 * GET /api/krapi/k1/activity/query (query params)
 * POST /api/krapi/k1/activity/query (body)
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);

    const user_id = searchParams.get("user_id");
    const project_id = searchParams.get("project_id");
    const action = searchParams.get("action");
    const resource_type = searchParams.get("resource_type");
    const resource_id = searchParams.get("resource_id");
    const severity = searchParams.get("severity");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);

    // SDK expects query options object
    const queryParams: {
      user_id?: string;
      project_id?: string;
      action?: string;
      resource_type?: string;
      resource_id?: string;
      severity?: string;
      start_date?: Date;
      end_date?: Date;
      limit?: number;
      offset?: number;
    } = {
      user_id: user_id || undefined,
      project_id: project_id || undefined,
      action: action || undefined,
      resource_type: resource_type || undefined,
      resource_id: resource_id || undefined,
      severity: severity || undefined,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    // SDK adapter.query() returns ActivityLog[] directly
    // The adapter unwraps the HTTP response and returns the array
    const result = await sdk.activity.query(queryParams);

    // LOG: What we received from SDK
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] activity.query received from SDK:", {
      type: typeof result,
      isArray: Array.isArray(result),
      isNull: result === null,
      isUndefined: result === undefined,
      keys: result && typeof result === "object" ? Object.keys(result) : [],
      length: Array.isArray(result) ? result.length : "N/A",
      sample: Array.isArray(result) && result.length > 0 ? result[0] : result,
      fullResult: JSON.stringify(result),
    });

    // SDK adapter should always return an array
    if (!Array.isArray(result)) {
      // eslint-disable-next-line no-console
      console.error("SDK activity.query() returned non-array:", {
        type: typeof result,
        isArray: Array.isArray(result),
        keys: result && typeof result === "object" ? Object.keys(result) : [],
        result,
      });
      throw new Error(
        `SDK activity.query() returned unexpected format: ${JSON.stringify(
          result
        )}. Expected array.`
      );
    }

    // Return in ApiResponse format so SDK adapter can properly unwrap it
    // The adapter expects response.data to exist, so we wrap the array
    const response = {
      success: true,
      data: result,
    };

    // LOG: What we're returning
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] activity.query returning:", {
      success: response.success,
      dataType: typeof response.data,
      dataIsArray: Array.isArray(response.data),
      dataLength: Array.isArray(response.data) ? response.data.length : "N/A",
      fullResponse: JSON.stringify(response),
    });

    return NextResponse.json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error querying activity logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to query activity logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Query activity logs (POST with body)
 * POST /api/krapi/k1/activity/query
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const queryParams = await request.json();

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);

    // SDK adapter.query() returns ActivityLog[] directly
    const result = await sdk.activity.query(queryParams);

    // LOG: What we received from SDK
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] activity.query (POST) received from SDK:", {
      type: typeof result,
      isArray: Array.isArray(result),
      isNull: result === null,
      isUndefined: result === undefined,
      keys: result && typeof result === "object" ? Object.keys(result) : [],
      length: Array.isArray(result) ? result.length : "N/A",
      sample: Array.isArray(result) && result.length > 0 ? result[0] : result,
      fullResult: JSON.stringify(result),
    });

    // SDK adapter should always return an array
    if (!Array.isArray(result)) {
      // eslint-disable-next-line no-console
      console.error("SDK activity.query() returned non-array:", {
        type: typeof result,
        isArray: Array.isArray(result),
        keys: result && typeof result === "object" ? Object.keys(result) : [],
        result,
      });
      throw new Error(
        `SDK activity.query() returned unexpected format: ${JSON.stringify(
          result
        )}. Expected array.`
      );
    }

    // Return in ApiResponse format so SDK adapter can unwrap it correctly
    const response = {
      success: true,
      data: result,
    };

    // LOG: What we're returning
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] activity.query (POST) returning:", {
      success: response.success,
      dataType: typeof response.data,
      dataIsArray: Array.isArray(response.data),
      dataLength: Array.isArray(response.data) ? response.data.length : "N/A",
      fullResponse: JSON.stringify(response),
    });

    return NextResponse.json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error querying activity logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to query activity logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
