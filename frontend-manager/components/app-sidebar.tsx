"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  User,
  TestTube2,
  Database,
  FileText,
  KeyRound,
  Mail,
  HardDrive,
} from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useReduxAuth();

  // Check if we're in a project context
  const isProjectContext = pathname.startsWith("/projects/");

  // If we're in a project context, show project-specific navigation
  if (isProjectContext) {
    return <ProjectSidebar />;
  }

  // Admin dashboard navigation
  const adminNavItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "Projects",
      icon: FolderOpen,
      href: "/projects",
    },
    {
      title: "MCP",
      icon: TestTube2,
      href: "/mcp",
    },
    {
      title: "Admin Users",
      icon: Users,
      href: "/users",
    },
    {
      title: "Test Access",
      icon: TestTube2,
      href: "/test-access",
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
    },
    {
      title: "Profile",
      icon: User,
      href: "/profile",
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold">KRAPI Admin</span>
            <span className="text-sm text-muted-foreground">
              Admin Dashboard
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href as any} className="block">
                <SidebarMenuButton
                  isActive={isActive}
                  className="w-full cursor-pointer"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.title}
                </SidebarMenuButton>
              </Link>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-2">
          <ThemeToggle />
          <button
            onClick={logout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// Project-specific sidebar component
function ProjectSidebar() {
  const pathname = usePathname();
  const { logout } = useReduxAuth();

  // Extract project ID from pathname
  const projectId = pathname.split("/")[2]; // /projects/[projectId]/...

  const projectNavItems = [
    {
      title: "Project Dashboard",
      icon: LayoutDashboard,
      href: `/projects/${projectId}`,
    },
    {
      title: "Collections",
      icon: FolderOpen,
      href: `/projects/${projectId}/collections`,
    },
    {
      title: "Documents",
      icon: Database,
      href: `/projects/${projectId}/documents`,
    },
    {
      title: "Users",
      icon: Users,
      href: `/projects/${projectId}/users`,
    },
    {
      title: "Files",
      icon: FileText,
      href: `/projects/${projectId}/files`,
    },
    {
      title: "Storage",
      icon: HardDrive,
      href: `/projects/${projectId}/storage`,
    },
    {
      title: "API Keys",
      icon: KeyRound,
      href: `/projects/${projectId}/api-keys`,
    },
    {
      title: "Email",
      icon: Mail,
      href: `/projects/${projectId}/email`,
    },
    {
      title: "MCP",
      icon: TestTube2,
      href: `/projects/${projectId}/mcp`,
    },
    {
      title: "Settings",
      icon: Settings,
      href: `/projects/${projectId}/settings`,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold">KRAPI Project</span>
            <span className="text-sm text-muted-foreground">
              Project Management
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {/* Back to Admin Dashboard */}
          <Link href="/dashboard" className="block">
            <SidebarMenuButton className="w-full cursor-pointer">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Back to Admin
            </SidebarMenuButton>
          </Link>

          {/* Back to Projects List */}
          <Link href="/projects" className="block">
            <SidebarMenuButton className="mb-4 w-full cursor-pointer">
              <FolderOpen className="h-4 w-4 mr-2" />← All Projects
            </SidebarMenuButton>
          </Link>

          {/* Project Navigation */}
          {projectNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href as any} className="block">
                <SidebarMenuButton
                  isActive={isActive}
                  className="w-full cursor-pointer"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.title}
                </SidebarMenuButton>
              </Link>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between px-2">
          <ThemeToggle />
          <button
            onClick={logout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
