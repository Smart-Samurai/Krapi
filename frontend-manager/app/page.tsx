/**
 * Home Page Component
 * 
 * Redirects users to the dashboard on load.
 * Shows a loading state during redirect.
 * 
 * @module app/page
 * @example
 * // Automatically redirects to /dashboard
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Home Page Component
 * 
 * Redirects users to the dashboard on initial load.
 * 
 * @returns {JSX.Element} Loading state during redirect
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-base font-bold text-foreground mb-2">Loading...</h1>
        <p className="text-muted-foreground">Redirecting to dashboard</p>
      </div>
    </div>
  );
}
