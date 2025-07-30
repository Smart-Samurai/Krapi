"use client";

import React, { useEffect, useState } from "react";
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
import { createDefaultKrapi } from "@/lib/krapi";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  // Check if we're on the login page
  const isLoginPage = pathname === "/login";
  const isStyletestPage = pathname === "/styletest";

  // Check if we're inside a specific project
  const projectMatch = pathname.match(/^\/projects\/([^\/]+)/);
  const isProjectDetailPage = !!projectMatch;
  const projectId = projectMatch?.[1];

  // Fetch project details when in project context
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId || !isProjectDetailPage) {
        setCurrentProject(null);
        return;
      }

      setIsLoadingProject(true);
      try {
        const krapi = createDefaultKrapi();
        const result = await krapi.admin.getProject(projectId);

        if (result.success && result.data) {
          setCurrentProject(result.data);
        } else {
          setCurrentProject(null);
        }
      } catch (error) {
        console.error("Failed to fetch project:", error);
        setCurrentProject(null);
      } finally {
        setIsLoadingProject(false);
      }
    };

    fetchProject();
  }, [projectId, isProjectDetailPage]);

  // Determine which navigation item is active based on current path
  const isActive = (href: string) => {
    if (href === "/dashboard" && pathname === "/dashboard") return true;
    if (href !== "/dashboard" && pathname.startsWith(href)) return true;
    return false;
  };

  // Get navigation items based on current route
  const getNavigationItems = () => {
    if (isLoginPage) {
      return {
        main: [
          {
            icon: navigationItems.dashboard.icon,
            label: "Back to Dashboard",
            href: "/dashboard",
            isActive: false,
          },
        ],
      };
    }

    if (isStyletestPage) {
      return {
        main: [
          {
            icon: navigationItems.dashboard.icon,
            label: "Dashboard",
            href: "/dashboard",
            isActive: false,
          },
          {
            icon: navigationItems.projects.icon,
            label: "Projects",
            href: "/projects",
            isActive: false,
          },
        ],
      };
    }

    // If we're inside a project, show project-specific navigation
    if (isProjectDetailPage && projectId) {
      return {
        main: [
          {
            icon: navigationItems.dashboard.icon,
            label: "Admin Dashboard",
            href: "/dashboard",
            isActive: false,
          },
          {
            icon: navigationItems.projects.icon,
            label: "All Projects",
            href: "/projects",
            isActive: false,
          },
        ],
        project: [
          {
            icon: navigationItems.dashboard.icon,
            label: "Project Overview",
            href: `/projects/${projectId}`,
            isActive: pathname === `/projects/${projectId}`,
          },
          {
            icon: navigationItems.users.icon,
            label: "Project Users",
            href: `/projects/${projectId}/users`,
            isActive: pathname === `/projects/${projectId}/users`,
          },
          {
            icon: navigationItems.database.icon,
            label: "Database",
            href: `/projects/${projectId}/database`,
            isActive: pathname === `/projects/${projectId}/database`,
          },
          {
            icon: navigationItems.storage.icon,
            label: "Storage",
            href: `/projects/${projectId}/storage`,
            isActive: pathname === `/projects/${projectId}/storage`,
          },
          {
            icon: navigationItems.api.icon,
            label: "API",
            href: `/projects/${projectId}/api`,
            isActive: pathname === `/projects/${projectId}/api`,
          },
          {
            icon: navigationItems.settings.icon,
            label: "Project Settings",
            href: `/projects/${projectId}/settings`,
            isActive: pathname === `/projects/${projectId}/settings`,
          },
        ],
      };
    }

    // Default admin navigation (when not in a project)
    return {
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
          label: "All Users",
          href: navigationItems.users.href,
          isActive: isActive(navigationItems.users.href),
        },
      ],
      system: [
        {
          icon: navigationItems.settings.icon,
          label: "System Settings",
          href: navigationItems.settings.href,
          isActive: isActive(navigationItems.settings.href),
        },
      ],
    };
  };

  const navItems = getNavigationItems();

  // For login page, don't render the sidebar at all
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <SidebarRoot className="h-screen">
        <Sidebar className="fixed left-0 top-0 h-full z-50">
          <SidebarHeader>
            <div className="space-y-1">
              <span className="block">KRAPI Admin</span>
              {isProjectDetailPage && (
                <div className="text-sm text-text/60">
                  {isLoadingProject ? (
                    <span className="animate-pulse">Loading project...</span>
                  ) : currentProject ? (
                    <div className="flex items-center gap-1">
                      <span className="text-text/40">Project:</span>
                      <span className="font-medium text-primary">
                        {currentProject.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-red-500">Project not found</span>
                  )}
                </div>
              )}
            </div>
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
            {navItems.project && (
              <SidebarNavGroup title="Current Project">
                {navItems.project.map((item) => (
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
