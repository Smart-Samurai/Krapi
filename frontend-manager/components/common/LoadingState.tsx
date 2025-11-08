/**
 * Loading State Components
 * 
 * Reusable loading state components with skeleton loaders.
 * 
 * @module components/common/LoadingState
 * @example
 * <LoadingState count={5} />
 * <LoadingCard message="Loading projects..." />
 */
"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading State Props
 * 
 * @interface LoadingStateProps
 * @property {number} [count=3] - Number of skeleton items to display
 */
interface LoadingStateProps {
  count?: number;
}

/**
 * Loading State Component
 * 
 * Displays skeleton loaders for loading states.
 * 
 * @param {LoadingStateProps} props - Component props
 * @returns {JSX.Element} Loading state with skeletons
 * 
 * @example
 * <LoadingState count={5} />
 */
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

/**
 * Loading Card Component
 * 
 * Card-style loading state with message.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.message="Loading..."] - Loading message
 * @returns {JSX.Element} Loading card
 * 
 * @example
 * <LoadingCard message="Loading projects..." />
 */
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
