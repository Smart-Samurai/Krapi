"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  SidebarRoot,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarNavItem,
  SidebarNavGroup,
  SidebarMain,
  navigationItems,
} from "@/components/styled";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();

  // Determine which navigation item is active based on current path
  const isActive = (href: string) => {
    if (href === "/dashboard" && pathname === "/dashboard") return true;
    if (href !== "/dashboard" && pathname.startsWith(href)) return true;
    return false;
  };

  // Get navigation items
  const navItems = {
    main: [
      {
        icon: navigationItems.dashboard.icon,
        label: navigationItems.dashboard.label,
        href: navigationItems.dashboard.href,
        isActive: isActive(navigationItems.dashboard.href),
      },
      {
        icon: navigationItems.projects.icon,
        label: navigationItems.projects.label,
        href: navigationItems.projects.href,
        isActive: isActive(navigationItems.projects.href),
      },
    ],
    management: [
      {
        icon: navigationItems.users.icon,
        label: navigationItems.users.label,
        href: navigationItems.users.href,
        isActive: isActive(navigationItems.users.href),
      },
      {
        icon: navigationItems.database.icon,
        label: navigationItems.database.label,
        href: navigationItems.database.href,
        isActive: isActive(navigationItems.database.href),
      },
      {
        icon: navigationItems.files.icon,
        label: navigationItems.files.label,
        href: navigationItems.files.href,
        isActive: isActive(navigationItems.files.href),
      },
    ],
    system: [
      {
        icon: navigationItems.health.icon,
        label: navigationItems.health.label,
        href: navigationItems.health.href,
        isActive: isActive(navigationItems.health.href),
      },
      {
        icon: navigationItems.api.icon,
        label: navigationItems.api.label,
        href: navigationItems.api.href,
        isActive: isActive(navigationItems.api.href),
      },
      {
        icon: navigationItems.auth.icon,
        label: navigationItems.auth.label,
        href: navigationItems.auth.href,
        isActive: isActive(navigationItems.auth.href),
      },
      {
        icon: navigationItems.settings.icon,
        label: navigationItems.settings.label,
        href: navigationItems.settings.href,
        isActive: isActive(navigationItems.settings.href),
      },
    ],
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <SidebarRoot className="h-screen">
        <Sidebar className="fixed left-0 top-0 h-full z-50">
          <SidebarHeader>
            <span>KRAPI Admin</span>
          </SidebarHeader>
          <SidebarContent>
            {navItems.main && (
              <SidebarNavGroup title="Main">
                {navItems.main.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    isActive={item.isActive}
                  />
                ))}
              </SidebarNavGroup>
            )}
            {navItems.management && (
              <SidebarNavGroup title="Management">
                {navItems.management.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    isActive={item.isActive}
                  />
                ))}
              </SidebarNavGroup>
            )}
            {navItems.system && (
              <SidebarNavGroup title="System">
                {navItems.system.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    isActive={item.isActive}
                  />
                ))}
              </SidebarNavGroup>
            )}
          </SidebarContent>
          <SidebarFooter>
            {/* Theme toggle is automatically included in SidebarFooter */}
          </SidebarFooter>
        </Sidebar>
        <SidebarMain>{children}</SidebarMain>
      </SidebarRoot>
    </SidebarProvider>
  );
}
