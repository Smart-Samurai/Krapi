import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  User,
  TestTube2,
} from "lucide-react";

export interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

export interface NavigationItems {
  dashboard: NavigationItem;
  projects: NavigationItem;
  mcp: NavigationItem;
  users: NavigationItem;
  settings: NavigationItem;
  testAccess: NavigationItem;
  profile: NavigationItem;
}

export const navigationItems: NavigationItems = {
  dashboard: {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
  },
  projects: {
    icon: FolderOpen,
    label: "Projects",
    href: "/projects",
  },
  mcp: {
    icon: TestTube2,
    label: "MCP",
    href: "/mcp",
  },
  users: {
    icon: Users,
    label: "Admin Users",
    href: "/users",
  },
  testAccess: {
    icon: TestTube2,
    label: "Test Access",
    href: "/test-access",
  },
  settings: {
    icon: Settings,
    label: "Settings",
    href: "/settings",
  },
  profile: {
    icon: User,
    label: "Profile",
    href: "/profile",
  },
};
