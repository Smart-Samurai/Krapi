/**
 * Home Redirect Page
 * 
 * Redirects users to dashboard or login based on authentication status.
 * 
 * @module app/home-redirect
 * @example
 * // Automatically rendered at / route
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useReduxAuth } from "@/contexts/redux-auth-context";

/**
 * Home Page Component
 * 
 * Redirects authenticated users to dashboard, unauthenticated users to login.
 * 
 * @returns {JSX.Element} Loading state during redirect
 */
export default function Home() {
  const router = useRouter();
  const { user, loading } = useReduxAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  // Show loading spinner while determining auth status
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-50">
      <div className="animate-spin  h-32 w-32 border-b-2 border-primary-600" />
    </div>
  );
}
