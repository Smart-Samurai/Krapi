import {
  LayoutDashboard,
  Database,
  HardDrive,
  Users,
  Settings,
  KeyRound,
  TestTube2,
} from "lucide-react";

export const categories = {
  main: "Main",
  admin: "Administration",
  tools: "Tools",
};

export const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    category: "main",
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Settings,
    category: "main",
  },
  {
    name: "Collections",
    href: "/collections",
    icon: Database,
    category: "main",
  },
  {
    name: "Storage",
    href: "/storage",
    icon: HardDrive,
    category: "main",
  },
  {
    name: "Admin Users",
    href: "/users",
    icon: Users,
    category: "admin",
  },
  {
    name: "API Keys",
    href: "/api-keys",
    icon: KeyRound,
    category: "admin",
  },
  {
    name: "Test Access",
    href: "/test-access",
    icon: TestTube2,
    category: "tools",
    badge: "New",
  },
];

export const navigationItems = navigation;
