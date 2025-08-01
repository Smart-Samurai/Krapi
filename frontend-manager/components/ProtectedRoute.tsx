"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Protected Route Component
 * 
 * Wraps pages/components that require authentication.
 * Automatically redirects to login page if user is not authenticated.
 * Shows loading spinner during authentication state hydration.
 * 
 * @component
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * ```
 * 
 * @param props - Component props
 * @param props.children - Child components to render when authenticated
 * @returns Protected content or loading/redirect state
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if not loading and not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while hydration is in progress
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated and hydration is complete
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
