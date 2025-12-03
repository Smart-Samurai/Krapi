/**
 * KRAPI Frontend API Catch-All Route
 *
 * This route handles all KRAPI API requests that don't have specific route handlers.
 * According to architecture rules, all routes should use SDK exclusively.
 * This catch-all returns proper error responses for invalid/missing routes.
 *
 * External apps should use specific routes like:
 * - /api/krapi/k1/auth/login
 * - /api/krapi/k1/projects
 * - /api/krapi/k1/collections
 * etc.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, "DELETE");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, "PATCH");
}

async function handleRequest(
  request: NextRequest,
  params: { krapi: string[] },
  method: string
) {
  try {
    const pathSegments = params.krapi || [];
    const requestedPath = pathSegments.join("/");

    // Validate request path format
    if (pathSegments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API path",
          message:
            "API path is required. Use format: /api/krapi/k1/{resource}/{action}",
          availableEndpoints: [
            "/api/krapi/k1/auth/login",
            "/api/krapi/k1/auth/logout",
            "/api/krapi/k1/auth/me",
            "/api/krapi/k1/projects",
            "/api/krapi/k1/collections",
            "/api/krapi/k1/documents",
            "/api/krapi/k1/storage",
            "/api/krapi/k1/backup",
            "/api/krapi/k1/email",
            "/api/krapi/k1/activity",
            "/api/krapi/k1/apikeys",
          ],
        },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if path starts with krapi/k1 (should be normalized by Next.js routing)
    const normalizedPath =
      pathSegments[0] === "krapi" && pathSegments[1] === "k1"
        ? pathSegments.slice(2).join("/")
        : requestedPath;

    // Validate authentication for non-public endpoints
    const authHeader = request.headers.get("authorization");
    const isPublicEndpoint =
      normalizedPath.startsWith("auth/login") ||
      normalizedPath.startsWith("health") ||
      normalizedPath.startsWith("mcp");

    if (!isPublicEndpoint && !authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          message:
            "This endpoint requires authentication. Please provide a valid Authorization header.",
        },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
            "WWW-Authenticate": "Bearer",
          },
        }
      );
    }

    // Return 404 for routes that don't have specific handlers
    // This means the route doesn't exist or wasn't properly configured
    return NextResponse.json(
      {
        success: false,
        error: "Route not found",
        message: `The requested endpoint '${normalizedPath}' does not exist or is not available.`,
        requestedPath: normalizedPath,
        method,
        suggestion:
          "Please check the API documentation for available endpoints.",
        availableEndpoints: [
          "/api/krapi/k1/auth/*",
          "/api/krapi/k1/projects/*",
          "/api/krapi/k1/collections/*",
          "/api/krapi/k1/documents/*",
          "/api/krapi/k1/storage/*",
          "/api/krapi/k1/backup/*",
          "/api/krapi/k1/email/*",
          "/api/krapi/k1/activity/*",
          "/api/krapi/k1/apikeys/*",
        ],
      },
      {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[CATCH-ALL] Error handling request:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
