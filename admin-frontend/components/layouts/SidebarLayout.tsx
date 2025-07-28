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

  // Check if we're inside a project context
  const isInProjectContext = pathname.includes("/projects/") && pathname.split("/").length > 3;
  const projectId = isInProjectContext ? pathname.split("/")[2] : null;

  // Fetch project details when in project context
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId || !isInProjectContext) {
        setCurrentProject(null);
        return;
      }

      setIsLoadingProject(true);
      try {
        const krapi = createDefaultKrapi();
        const result = await krapi.projects.get(projectId);
        
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
  }, [projectId, isInProjectContext]);

  // Determine which navigation item is active based on current path
  const isActive = (href: string) => {
    if (href === "/dashboard" && pathname === "/dashboard") return true;
    if (href !== "/dashboard" && pathname.startsWith(href)) return true;
    return false;
  };

  // Get navigation items - separate global and project-specific items
  const globalNavItems = {
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
    system: [
      {
        icon: navigationItems.users.icon,
        label: navigationItems.users.label,
        href: navigationItems.users.href,
        isActive: isActive(navigationItems.users.href),
      },
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

  // Project-specific navigation items (only shown when inside a project)
  const projectNavItems = isInProjectContext ? {
    project: [
      {
        icon: navigationItems.database.icon,
        label: navigationItems.database.label,
        href: `/projects/${projectId}/database`,
        isActive: pathname.includes("/database"),
      },
      {
        icon: navigationItems.files.icon,
        label: navigationItems.files.label,
        href: `/projects/${projectId}/files`,
        isActive: pathname.includes("/files"),
      },
    ],
  } : null;

  return (
    <SidebarProvider defaultOpen={true}>
      <SidebarRoot className="h-screen">
        <Sidebar className="fixed left-0 top-0 h-full z-50">
          <SidebarHeader>
            <div className="space-y-1">
              <span className="block">KRAPI Admin</span>
              {isInProjectContext && (
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
            {globalNavItems.main && (
              <SidebarNavGroup title="Main">
                {globalNavItems.main.map((item) => (
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
            {projectNavItems?.project && (
              <SidebarNavGroup title="Project">
                {projectNavItems.project.map((item) => (
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
            {globalNavItems.system && (
              <SidebarNavGroup title="System">
                {globalNavItems.system.map((item) => (
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
