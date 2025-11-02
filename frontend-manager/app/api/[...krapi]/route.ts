/**
 * KRAPI Frontend API Proxy
 *
 * This route proxies all KRAPI API requests from external applications
 * through the frontend to the backend server.
 *
 * External apps can use: https://your-frontend.com/api/krapi/k1/...
 * Which will proxy to: https://your-backend.com/krapi/k1/...
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams, "DELETE");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ krapi: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams, "PATCH");
}

async function proxyRequest(
  request: NextRequest,
  params: { krapi: string[] },
  method: string
) {
  try {
    // Build the backend URL
    const pathSegments = params.krapi || [];
    // Remove 'krapi' and 'k1' from the beginning if they exist to avoid duplication
    const cleanSegments =
      pathSegments[0] === "krapi" && pathSegments[1] === "k1"
        ? pathSegments.slice(2)
        : pathSegments;
    const backendPath = `/krapi/k1/${cleanSegments.join("/")}`;
    const backendUrl = `${BACKEND_URL}${backendPath}`;

    // Get query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const fullBackendUrl = searchParams
      ? `${backendUrl}?${searchParams}`
      : backendUrl;

    // Debug logging removed for production

    // Prepare headers (exclude host and other problematic headers)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.startsWith("host") &&
        !lowerKey.startsWith("x-forwarded") &&
        !lowerKey.startsWith("x-vercel") &&
        !lowerKey.startsWith("x-middleware") &&
        lowerKey !== "connection" &&
        lowerKey !== "content-length"
      ) {
        headers.set(key, value);
      }
    });

    // Add proxy headers
    headers.set("X-Forwarded-For", "unknown"); // request.ip not available in Next.js 15
    headers.set("X-Forwarded-Host", request.headers.get("host") || "unknown");
    headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

    // Prepare request body for non-GET requests
    let body: string | undefined;
    if (method !== "GET" && method !== "DELETE") {
      try {
        body = await request.text();
      } catch {
        
      }
    }

    // Make the request to the backend
    const response = await fetch(fullBackendUrl, {
      method,
      headers,
      body: body || undefined,
    });

    // Get response data
    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Return the response
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-Key",
        "Content-Type": "application/json",
      },
    });
  } catch {
    // 

    return NextResponse.json(
      {
        error: "Proxy Error",
        message: "Failed to proxy request to backend",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-API-Key",
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
