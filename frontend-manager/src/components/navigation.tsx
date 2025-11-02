"use client";

import {
  LayoutDashboard,
  Database,
  Key,
  Settings,
  Play,
  Monitor,
  Users,
  Mail,
  Server,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "System overview and monitoring",
  },
  {
    name: "Projects",
    href: "/projects",
    icon: Database,
    description: "Manage projects and collections",
  },
  {
    name: "API Keys",
    href: "/api-keys",
    icon: Key,
    description: "Manage API keys and permissions",
  },
  {
    name: "Test Suite",
    href: "/test",
    icon: Play,
    description: "Run comprehensive tests",
  },
  {
    name: "System",
    href: "/system",
    icon: Monitor,
    description: "System settings and monitoring",
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
    description: "User management",
  },
  {
    name: "Email",
    href: "/email",
    icon: Mail,
    description: "Email templates and settings",
  },
  {
    name: "Storage",
    href: "/storage",
    icon: Server,
    description: "File storage management",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Application settings",
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <item.icon
              className={cn(
                "mr-3 h-5 w-5 flex-shrink-0",
                isActive
                  ? "text-blue-500"
                  : "text-gray-400 group-hover:text-gray-500"
              )}
            />
            <div className="flex-1">
              <div>{item.name}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1 overflow-x-auto">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center px-3 py-2 text-xs font-medium rounded-md transition-colors min-w-0",
              isActive
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 mb-1",
                isActive ? "text-blue-500" : "text-gray-400"
              )}
            />
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

