"use client";

import React from "react";

import { cn } from "@/lib/utils";

interface InfoBlockProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "info" | "warning" | "error" | "success";
}

export function InfoBlock({
  title,
  description,
  children,
  className,
  variant = "info",
}: InfoBlockProps) {
  const variantClasses = {
    info: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
    warning: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
    error: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
    success: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
  };

  return (
    <div className={cn("p-4 rounded border", variantClasses[variant], className)}>
      {title ? <h3 className="font-semibold mb-2">{title}</h3> : null}
      {description ? <p className="text-sm text-black mb-2">{description}</p> : null}
      {children}
    </div>
  );
}

