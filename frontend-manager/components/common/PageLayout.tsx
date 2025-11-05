"use client";

import { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`w-full max-w-full overflow-x-hidden space-y-6 ${className}`}>
      {children}
    </div>
  );
}
