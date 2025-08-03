"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { navigationItems } from "@/lib/navigation-config";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Project {
  id: string;
  name: string;
  description?: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const { krapi } = useAuth();

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

      if (!krapi) {
        return;
      }

      setIsLoadingProject(true);
      try {
        const result = await krapi.projects.getById(projectId);

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
  }, [projectId, isProjectDetailPage, krapi]);

  // Determine which navigation item is active based on current path
  const isActive = (href: string) => {
    if (href === "/dashboard" && pathname === "/dashboard") return true;
    if (href !== "/dashboard" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold">KRAPI Admin</span>
            {isProjectDetailPage && (
              <div className="text-sm text-muted-foreground">
                {isLoadingProject ? (
                  <span className="animate-pulse">Loading project...</span>
                ) : currentProject ? (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Project:</span>
                    <span className="font-medium text-foreground">
                      {currentProject.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-destructive">Project not found</span>
                )}
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
              <Link href="/dashboard">
                <navigationItems.dashboard.icon className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild isActive={isActive("/projects")}>
              <Link href="/projects">
                <navigationItems.projects.icon className="h-4 w-4" />
                <span>Projects</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild isActive={isActive("/users")}>
              <Link href="/users">
                <navigationItems.users.icon className="h-4 w-4" />
                <span>Users</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild isActive={isActive("/storage")}>
              <Link href="/storage">
                <navigationItems.storage.icon className="h-4 w-4" />
                <span>Storage</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild isActive={isActive("/api-keys")}>
              <Link href="/api-keys">
                <navigationItems.apiKeys.icon className="h-4 w-4" />
                <span>API Keys</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild isActive={isActive("/test-access")}>
              <Link href="/test-access">
                <navigationItems.testAccess.icon className="h-4 w-4" />
                <span>Test Access</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton asChild isActive={isActive("/settings")}>
              <Link href="/settings">
                <navigationItems.settings.icon className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
