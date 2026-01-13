"use client";

import { LucideIcon } from "lucide-react";
import React from "react";


import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon | React.ReactNode;
  action?: React.ReactNode | {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  "data-testid"?: string;
}

export function EmptyState({
  title = "No items found",
  description,
  icon: Icon,
  action,
  className,
  "data-testid": testId,
}: EmptyStateProps) {
  // Handle icon: can be a LucideIcon (function component) or React.ReactNode
  // If it's a function, render it as a component
  // If it's already a React element, render it directly
  // Otherwise, don't render anything
  const renderIcon = () => {
    if (!Icon) return null;
    
    // If it's a function (LucideIcon), render it as a component
    if (typeof Icon === "function") {
      const IconComponent = Icon;
      return <IconComponent className="h-12 w-12 text-muted-foreground" />;
    }
    
    // If it's a valid React element, render it directly
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    
    // Otherwise, don't render (prevents React Error #31)
    return null;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
      data-testid={testId}
    >
      <div className={Icon ? "mb-4" : "hidden"}>
        {renderIcon()}
      </div>
      <h3 className="text-lg font-semibold">{String(title || "")}</h3>
      <div className={description ? "" : "hidden"}>
        <p className="text-base text-muted-foreground mt-2 max-w-sm">
          {String(description || "")}
        </p>
      </div>
      <div className={action ? "mt-4" : "hidden"}>
        {action && typeof action === "object" && "label" in action && "onClick" in action ? (
          (() => {
            const actionObj = action as { label: string; onClick: () => void; icon?: LucideIcon };
            const IconComponent = actionObj.icon && typeof actionObj.icon === "function" ? actionObj.icon : null;
            return (
              <Button onClick={actionObj.onClick}>
                {IconComponent ? <IconComponent className="mr-2 h-4 w-4" /> : null}
                {String(actionObj.label || "")}
              </Button>
            );
          })()
        ) : (
          (action as React.ReactNode) || null
        )}
      </div>
    </div>
  );
}

