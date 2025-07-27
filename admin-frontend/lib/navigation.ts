import {
  Users,
  Code,
  Activity,
  Home,
  FolderOpen,
  Settings,
  Shield,
} from "lucide-react";
import { LucideProps } from "lucide-react";

export const categories = {
  main: "Main",
  admin: "Administration",
  project: "Project Management",
  system: "System",
  tools: "Tools",
};

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  category: string;
  badge?: string;
}

export const navigation: NavigationItem[] = [
  // Main
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    category: "main",
  },

  // Project Management
  {
    name: "Projects",
    href: "/dashboard",
    icon: FolderOpen,
    category: "project",
  },

  // Administration
  {
    name: "Admin Dashboard",
    href: "/admin",
    icon: Shield,
    category: "admin",
  },
  {
    name: "Admin Users",
    href: "/admin/users",
    icon: Users,
    category: "admin",
  },
  {
    name: "System Settings",
    href: "/admin/settings",
    icon: Settings,
    category: "admin",
  },

  // System
  {
    name: "Health Monitor",
    href: "/admin/health",
    icon: Activity,
    category: "system",
  },

  // Tools
  {
    name: "API Test",
    href: "/admin/api-test",
    icon: Code,
    category: "tools",
  },
];
