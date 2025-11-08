/**
 * Page Layout Component
 * 
 * Wrapper component for page content with consistent spacing and layout.
 * 
 * @module components/common/PageLayout
 * @example
 * <PageLayout>
 *   <PageHeader title="Projects" />
 *   <ProjectList />
 * </PageLayout>
 */
"use client";

import { ReactNode } from "react";

/**
 * Page Layout Props
 * 
 * @interface PageLayoutProps
 * @property {ReactNode} children - Page content
 * @property {string} [className] - Additional CSS classes
 */
interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page Layout Component
 * 
 * Provides consistent layout wrapper for page content.
 * 
 * @param {PageLayoutProps} props - Component props
 * @returns {JSX.Element} Page layout wrapper
 * 
 * @example
 * <PageLayout>
 *   <PageHeader title="Projects" />
 *   <Content />
 * </PageLayout>
 */
export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`w-full max-w-full overflow-x-hidden space-y-6 ${className}`}>
      {children}
    </div>
  );
}
