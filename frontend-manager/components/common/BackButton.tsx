"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  fallbackUrl?: string;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * BackButton Component
 * 
 * Navigates back in browser history, with optional fallback URL.
 * Positioned for use in top-left corner of pages.
 */
export function BackButton({
  fallbackUrl,
  label = "Back",
  className,
  "data-testid": testId,
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else if (fallbackUrl) {
      router.push(fallbackUrl);
    } else {
      // Default fallback to projects list
      router.push("/projects");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={cn("flex items-center gap-2", className)}
      data-testid={testId || "back-button"}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
