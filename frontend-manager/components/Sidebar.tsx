"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Database } from "lucide-react";
import { navigationItems } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  projectId?: string;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

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
              <span className="ml-2 text-lg font-semibold text-text">
                KRAPI
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="hover:bg-background-200"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-text" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-text" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            if (collapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-background-200",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-text-secondary hover:text-text"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-background-200",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-text-secondary hover:text-text"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.name}</span>
                {item.badge && (
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className="ml-auto"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-background-300 p-4">
          {!collapsed ? (
            <div className="space-y-1 text-xs text-text-secondary">
              <p>KRAPI v2.0.0</p>
              <p>© 2024 KRAPI</p>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-200">
                  <Database className="h-4 w-4 text-text-secondary" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>KRAPI v2.0.0</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
