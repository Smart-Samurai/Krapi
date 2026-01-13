"use client";

import React from "react";

import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  count?: number;
}

export function LoadingState({ count = 3 }: LoadingStateProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={`loading-skeleton-${i}`} className="h-20 w-full" />
      ))}
    </div>
  );
}

