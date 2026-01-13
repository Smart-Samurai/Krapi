"use client";

import React from "react";

interface DataTableActionsProps {
  children: React.ReactNode;
}

export function DataTableActions({ children }: DataTableActionsProps) {
  return <div className="flex items-center gap-2">{children}</div>;
}

