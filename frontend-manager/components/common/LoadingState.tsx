"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  count?: number;
}

export function LoadingState({
  count = 3,
}: LoadingStateProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: count }).map((_, index) => {
          const skeletonId = `loading-skeleton-${index}-${Date.now()}-${Math.random()}`;
          return (
            <Skeleton key={skeletonId} className="h-32 w-full" />
          );
        })}
      </div>
    </div>
  );
}

export function LoadingCard({ message = "Loading..." }: { message?: string }) {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Skeleton className="h-12 w-12 mx-auto mb-4" />
        <h3 className="text-base font-semibold mb-2">{message}</h3>
        <p className="text-muted-foreground">
          Please wait while we fetch the data.
        </p>
      </CardContent>
    </Card>
  );
}
