import {
  Database,
  Users,
  FileText,
  Mail,
  Upload,
  Route,
  Code,
  Shield,
  Activity,
  BookOpen,
  Home,
  Brain,
} from "lucide-react";

export const categories = {
  main: "Main",
  content: "Content Management",
  admin: "Administration",
  system: "System",
  tools: "Tools",
};

export const navigation = [
  // Main
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    category: "main",
  },
  // Content Management
  {
    name: "Content",
    href: "/dashboard/content",
    icon: FileText,
    category: "content",
  },
  {
    name: "Routes",
    href: "/dashboard/routes",
    icon: Route,
    category: "content",
  },

  // Administration
  {
    name: "Users",
    href: "/dashboard/users",
    icon: Users,
    category: "admin",
  },
  {
    name: "Database",
    href: "/dashboard/database",
    icon: Database,
    category: "admin",
  },
  {
    name: "API Management",
    href: "/dashboard/api",
    icon: Code,
    category: "admin",
  },
  {
    name: "Auth & Security",
    href: "/dashboard/auth",
    icon: Shield,
    category: "admin",
  },

  // System
  {
    name: "Files",
    href: "/dashboard/files",
    icon: Upload,
    category: "system",
  },
  {
    name: "Email",
    href: "/dashboard/email",
    icon: Mail,
    category: "system",
  },
  {
    name: "Health Monitor",
    href: "/dashboard/health",
    icon: Activity,
    category: "system",
  },

  // Tools
  {
    name: "AI & MCP",
    href: "/dashboard/ai",
    icon: Brain,
    category: "tools",
    badge: "New",
  },
  {
    name: "API Test",
    href: "/dashboard/api-test",
    icon: Code,
    category: "tools",
  },
  {
    name: "Documentation",
    href: "/dashboard/docs",
    icon: BookOpen,
    category: "tools",
  },
];
