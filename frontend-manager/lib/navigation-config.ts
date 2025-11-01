import {
  LayoutDashboard,
  Users,
  Settings,
  User,
  TestTube2,
  Key,
  Monitor,
  Mail,
  Server,
  Database,
} from "lucide-react";

export interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

export interface NavigationItems {
  dashboard: NavigationItem;
  projects: NavigationItem;
  apiKeys: NavigationItem;
  testSuite: NavigationItem;
  system: NavigationItem;
  users: NavigationItem;
  email: NavigationItem;
  storage: NavigationItem;
  settings: NavigationItem;
  profile: NavigationItem;
}

export const navigationItems: NavigationItems = {
  dashboard: {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
  },
  projects: {
    icon: Database,
    label: "Projects",
    href: "/projects",
  },
  apiKeys: {
    icon: Key,
    label: "API Keys",
    href: "/api-keys",
  },
  testSuite: {
    icon: TestTube2,
    label: "Test Suite",
    href: "/test",
  },
  system: {
    icon: Monitor,
    label: "System",
    href: "/system",
  },
  users: {
    icon: Users,
    label: "Users",
    href: "/users",
  },
  email: {
    icon: Mail,
    label: "Email",
    href: "/email",
  },
  storage: {
    icon: Server,
    label: "Storage",
    href: "/storage",
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
