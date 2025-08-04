"use client";

import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation-config";

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

export default function SidebarGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
