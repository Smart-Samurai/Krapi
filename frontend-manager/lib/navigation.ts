import {
  Home,
  Activity,
  Settings,
  Users,
  Database,
  FileText,
  Code,
  Shield,
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  children?: NavItem[];
};

export const navigationItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Code,
  },
  {
    name: "Admin Users",
    href: "/users",
    icon: Users,
  },
  {
    name: "Database",
    href: "/database",
    icon: Database,
  },
  {
    name: "Storage",
    href: "/storage", 
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const adminNavigationItems: NavItem[] = [
  {
    name: "Admin Dashboard",
    href: "/admin",
    icon: Shield,
    children: [
      {
        name: "Overview",
        href: "/admin/dashboard",
        icon: Home,
      },
      {
        name: "User Management",
        href: "/admin/users",
        icon: Users,
      },
      {
        name: "System Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];
