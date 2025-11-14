import { NextResponse, type NextRequest } from "next/server";

// List of paths that don't require authentication
const _publicPaths = ["/login", "/api/auth", "/api/krapi"];

export function proxy(_request: NextRequest) {
  // Temporarily disable middleware for testing
  return NextResponse.next();

  // Original middleware logic commented out for now
  /*
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // For API routes, check Authorization header instead of cookies
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");
    const hasAuth = !!authHeader && authHeader.startsWith("Bearer ");
    
    if (!hasAuth) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid Authorization header" },
        { status: 401 }
      );
    }
    
    return NextResponse.next();
  }

  // For non-API routes, check for authentication tokens in cookies
  const sessionToken = request.cookies.get("session_token")?.value;
  const hasAuth = !!sessionToken;

  // Redirect to login if not authenticated
  if (!hasAuth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
  */
}

// Configure which routes the middleware runs on
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
