/**
 * Sidebar Layout
 * 
 * Layout component for pages with sidebar navigation.
 * Provides sidebar, header, and main content area.
 * 
 * @module app/(sidebar)/layout
 * @example
 * // Automatically wraps all pages in (sidebar) route group
 */
/**
 * Sidebar Layout
 * 
 * Layout component for sidebar pages with navigation and header.
 * Provides consistent layout structure for all sidebar pages.
 * 
 * @module app/(sidebar)/layout
 * @example
 * // Automatically wraps all pages in (sidebar) route group
 */
"use client";

import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { navigationItems } from "@/lib/navigation-config";

/**
 * Get Page Title from Pathname
 * 
 * Determines page title based on current pathname.
 * 
 * @param {string} pathname - Current pathname
 * @returns {string} Page title
 */
function getPageTitle(pathname: string): string {
  // Find matching navigation item
  const navItem = Object.values(navigationItems).find(item => 
    pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard")
  );
  
  if (navItem) {
    return navItem.label;
  }

  // Default fallback based on pathname
  if (pathname.startsWith("/projects/")) {
    return "Project Details";
  }
  
  return "Dashboard";
}

/**
 * Sidebar Group Layout Component
 * 
 * Layout wrapper for sidebar pages with navigation and header.
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Page content
 * @returns {JSX.Element} Layout with sidebar
 */
export default function SidebarGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname || "");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4" data-testid="page-header">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-base font-semibold">{pageTitle}</h1>
        </header>
        <main className="flex flex-1 flex-col p-6 w-full max-w-full overflow-x-hidden min-w-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
