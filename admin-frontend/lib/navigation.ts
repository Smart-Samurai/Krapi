import {
  Users,
  Code,
  Activity,
  Home,
  FolderOpen,
  Settings,
} from "lucide-react";

export const categories = {
  main: "Main",
  admin: "Administration",
  project: "Project Management",
  system: "System",
  tools: "Tools",
};

export const navigation = [
  // Main
  {
    name: "Admin Dashboard",
    href: "/admin",
    icon: Home,
    category: "main",
  },
  {
    name: "Projects",
    href: "/admin/projects",
    icon: FolderOpen,
    category: "main",
  },

  // Administration
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
