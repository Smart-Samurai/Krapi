import { NextResponse, type NextRequest } from "next/server";

/**
 * List of paths that don't require authentication
 * These paths are accessible without a valid session token
 */
const publicPaths = ["/login", "/api/auth", "/api/krapi"];

/**
 * Validates a session token with the backend
 * 
 * @param {string} token - The session token to validate
 * @returns {Promise<boolean>} True if token is valid, false otherwise
 */
async function validateTokenWithBackend(token: string): Promise<boolean> {
  try {
    // SDK-FIRST: Use centralized config for backend URL
    const { config } = await import("@/lib/config");
    const backendApiUrl = config.backend.getApiUrl('/auth/me');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.auth.tokenValidationTimeout);

    const response = await fetch(backendApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.success === true && result.data !== undefined;
  } catch (_error) {
    // If validation fails (network error, timeout, etc.), treat as invalid
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


