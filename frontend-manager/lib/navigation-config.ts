import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Database,
  HardDrive,
  Settings,
  KeyRound,
  TestTube2,
  User,
  Code,
  Shield,
} from "lucide-react";

export interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

export interface NavigationItems {
  dashboard: NavigationItem;
  projects: NavigationItem;
  users: NavigationItem;
  database: NavigationItem;
  storage: NavigationItem;
  api: NavigationItem;
  auth: NavigationItem;
  settings: NavigationItem;
  apiKeys: NavigationItem;
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
  users: {
    icon: Users,
    label: "Admin Users",
    href: "/users",
  },
  database: {
    icon: Database,
    label: "Database",
    href: "/database",
  },
  storage: {
    icon: HardDrive,
    label: "Storage",
    href: "/storage",
  },
  api: {
    icon: Code,
    label: "API",
    href: "/api",
  },
  auth: {
    icon: Shield,
    label: "Auth",
    href: "/auth",
  },
  settings: {
    icon: Settings,
    label: "Settings",
    href: "/settings",
  },
  apiKeys: {
    icon: KeyRound,
    label: "API Keys",
    href: "/api-keys",
  },
  testAccess: {
    icon: TestTube2,
    label: "Test Access",
    href: "/test-access",
  },
  profile: {
    icon: User,
    label: "Profile",
    href: "/profile",
  },
}; 