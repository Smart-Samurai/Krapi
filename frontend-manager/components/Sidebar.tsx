"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Database } from "lucide-react";
import { navigation, categories } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Navigation items and categories imported from shared configuration

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  projectId?: string;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const groupedNavigation = navigation.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category]!.push(item);
    return acc;
  }, {} as Record<string, typeof navigation>);

  return (
    <TooltipProvider>
      <div
        role="complementary"
        className={cn(
          "relative flex h-full flex-col border-r border-background-300 bg-background-100 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-background-300 px-4">
          {!collapsed && (
            <div className="flex items-center">
              <Database className="h-8 w-8 text-text" />
              <span className="ml-2 text-xl font-bold text-text">
                Krapi CMS
              </span>
            </div>
          )}
          {collapsed && (
            <div className="flex w-full justify-center">
              <Database className="h-8 w-8 text-text" />
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute -right-6 top-24 z-20 h-10 w-10 rounded-full border border-background-300 bg-background-100 p-2 shadow-lg hover:bg-background-200 hover:shadow-xl transition-all duration-200",
            "hidden lg:flex"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {Object.entries(groupedNavigation).map(([category, items]) => (
            <div key={category} className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-600">
                  {categories[category as keyof typeof categories]}
                </h3>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = pathname === item.href;
                  const NavItem = (
                    <Link
                      key={item.name}
                      href={
                        item.href as
                          | "/dashboard"
                          | "/dashboard/content"
                          | "/dashboard/users"
                          | "/dashboard/database"
                          | "/dashboard/api"
                          | "/dashboard/auth"
                          | "/dashboard/files"
                          | "/dashboard/health"
                          | "/dashboard/api-test"
                          | "/dashboard/docs"
                          | "/dashboard/routes"
                          | "/dashboard/ai"
                      }
                      className={cn(
                        "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-text"
                          : "text-text-600 hover:bg-background-200 hover:text-text",
                        collapsed && "justify-center"
                      )}
                      data-testid={`nav-${item.name
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      <div
                        data-testid={`${item.name
                          .toLowerCase()
                          .replace(/\s+/g, "-")}-icon`}
                        className={cn(
                          "h-5 w-5 flex-shrink-0",
                          isActive
                            ? "text-text"
                            : "text-text-400 group-hover:text-text-600",
                          !collapsed && "mr-3"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                      </div>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "ml-2 text-xs",
                                item.badge === "New" &&
                                  "bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300",
                                item.badge === "Pro" &&
                                  "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300",
                                item.badge === "Enterprise" &&
                                  "bg-background-200 text-text-700 dark:bg-background-200 dark:text-text-700"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="flex items-center">
                            <span>{item.name}</span>
                            {item.badge && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "ml-2 text-xs",
                                  item.badge === "New" &&
                                    "bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300",
                                  item.badge === "Pro" &&
                                    "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300",
                                  item.badge === "Enterprise" &&
                                    "bg-background-200 text-text-700 dark:bg-background-200 dark:text-text-700"
                                )}
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return NavItem;
                })}
              </div>
              {!collapsed && <Separator className="my-2" />}
            </div>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
}
