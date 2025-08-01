"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredScopes?: string | string[];
  fallbackUrl?: string;
}

export function ProtectedRoute({
  children,
  requiredScopes,
  fallbackUrl = "/login",
}: ProtectedRouteProps) {
  const { user, loading, hasScope } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // If user is not authenticated, redirect to login
      if (!user) {
        const currentPath = window.location.pathname;
        window.location.href = `${fallbackUrl}?from=${encodeURIComponent(
          currentPath
        )}`;
        return;
      }

      // If specific scopes are required, check them
      if (requiredScopes && !hasScope(requiredScopes)) {
        router.push("/dashboard");
      }
    }
  }, [user, loading, requiredScopes, hasScope, router, fallbackUrl]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!user) {
    return null;
  }

  // Don't render children if required scopes are not met
  if (requiredScopes && !hasScope(requiredScopes)) {
    return null;
  }

  return <>{children}</>;
}
