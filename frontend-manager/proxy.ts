import { NextResponse, type NextRequest } from "next/server";

import { config as appConfig } from "@/lib/config";

/**
 * List of paths that don't require authentication
 * These paths are accessible without a valid session token
 */
const publicPaths = [
  "/login",
  "/register",
  "/api/auth",
  "/api/krapi",
  "/api/client", // Client routes (used by frontend GUI, like 3rd party app)
];

/**
 * Validates a session token with the backend using SDK
 * 
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to validate tokens.
 * NO direct fetch calls allowed - all communication goes through SDK.
 * 
 * @param {string} token - The session token to validate
 * @returns {Promise<boolean>} True if token is valid, false otherwise
 */
async function validateTokenWithBackend(token: string): Promise<boolean> {
  try {
    // SDK-FIRST: Use backend SDK client (connects to backend URL with API key)
    // We use API key authentication for the SDK client, then validate the session token
    const { getBackendSdkClient } = await import("@/app/api/lib/backend-sdk-client");
    const backendSdk = await getBackendSdkClient();

    // Use SDK's auth.validateSession() method to validate the token
    // This method validates the session token without requiring it to be set in the SDK
    const result = await backendSdk.auth.validateSession(token);

    // SDK returns { valid: boolean, session?: {...} } format
    return result?.valid === true;
  } catch (_error) {
    // If validation fails (network error, timeout, SDK error, etc.), treat as invalid
    return false;
  }
}

/**
 * Next.js 16 Proxy
 * 
 * Handles authentication checks for all routes:
 * - Allows public paths without authentication
 * - Validates session tokens for protected routes
 * - Redirects to login if authentication fails
 * 
 * Note: In Next.js 16, middleware.ts has been renamed to proxy.ts
 * to better reflect its role in handling network requests.
 * 
 * @param {NextRequest} request - The incoming request
 * @returns {Promise<NextResponse>} Response or redirect
 */
export function proxy(request: NextRequest): Promise<NextResponse> {
  return handleProxyRequest(request);
}

function buildAllowedOrigins(): string[] {
  const envOrigins =
    process.env.KRAPI_ALLOWED_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    "";
  const parsed =
    envOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) || [];

  const defaults = [
    "http://localhost",
    "http://localhost:3498",
    "http://127.0.0.1",
    "http://127.0.0.1:3498",
  ];

  const configuredFrontendUrl =
    process.env.KRAPI_FRONTEND_PUBLIC_URL ||
    appConfig.frontend.url ||
    "";

  return Array.from(
    new Set(
      [...defaults, configuredFrontendUrl, ...parsed].filter(Boolean)
    )
  );
}

const FRONTEND_ALLOWED_ORIGINS = buildAllowedOrigins();

function isOriginAllowed(origin?: string | null): boolean {
  if (!origin) return true;
  return FRONTEND_ALLOWED_ORIGINS.includes(origin);
}

/**
 * Handles the proxy request logic
 * 
 * @param {NextRequest} request - The incoming request
 * @returns {Promise<NextResponse>} Response or redirect
 */
async function handleProxyRequest(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internal routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public/")
  ) {
    return NextResponse.next();
  }

  // Origin allowlist enforcement (frontend listener)
  const origin = request.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return new NextResponse("Origin not allowed", { status: 403 });
  }

  // Allow public paths without authentication
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow root path - it will handle redirect internally
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Get token from cookie or Authorization header
  const sessionToken =
    request.cookies.get("session_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  // If no token found, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate token with backend
  const isValid = await validateTokenWithBackend(sessionToken);

  if (!isValid) {
    // Token is invalid, clear cookie and redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    
    // Clear the invalid session token cookie
    response.cookies.delete("session_token");
    
    return response;
  }

  // Token is valid, allow request to proceed
  return NextResponse.next();
}

// Configure which routes the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};


