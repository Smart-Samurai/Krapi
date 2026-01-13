"use client";
/* eslint-disable import/order, react/jsx-no-leaked-render */

import React from "react";

import { cn } from "@/lib/utils";
import { BackButton } from "./BackButton";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  showBackButton?: boolean;
  backButtonFallback?: string;
  "data-testid"?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
  showBackButton = false,
  backButtonFallback,
  "data-testid": testId,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)} data-testid={testId}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <BackButton
              fallbackUrl={backButtonFallback}
              className="-ml-2"
            />
          )}
          <div>
            <h1 className="text-2xl font-semibold">{String(title || "")}</h1>
            <div className={description ? "" : "hidden"}>
              <p className="text-base text-muted-foreground mt-1">
                {String(description || "")}
              </p>
            </div>
          </div>
        </div>
        <div className={action ? "flex items-center gap-2" : "hidden"}>
          {action}
        </div>
      </div>
    </div>
  );
}

