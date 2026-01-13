"use client";

import { LucideIcon } from "lucide-react";
import React from "react";


import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionButtonProps extends Omit<ButtonProps, "variant"> {
  variant?: "add" | "edit" | "delete" | "confirm" | "outline" | "default";
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function ActionButton({
  variant = "add",
  icon: Icon,
  children,
  className,
  asChild,
  ...props
}: ActionButtonProps) {
  const variantClasses = {
    add: "btn-add",
    edit: "btn-edit",
    confirm: "btn-confirm",
    delete: "btn-delete",
    outline: "border border-border bg-background hover:bg-accent",
    default: "",
  };

  // When asChild is true, we can't add the icon separately because Slot requires exactly one child
  // Instead, we need to clone the child and add the icon inside it
  if (asChild && Icon) {
    // Check if children is a single React element
    const childrenArray = React.Children.toArray(children);
    if (childrenArray.length !== 1) {
      // If multiple children, wrap them in a fragment and don't use asChild
      return (
        <Button
          className={cn(variant !== "default" && variantClasses[variant], className)}
          variant={variant === "outline" ? "outline" : "default"}
          {...props}
        >
          <Icon className="mr-2 h-4 w-4" />
          {children}
        </Button>
      );
    }
    
    // Single child - clone it and add the icon
    const child = childrenArray[0] as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
    
    return (
      <Button
        className={cn(variant !== "default" && variantClasses[variant], className)}
        variant={variant === "outline" ? "outline" : "default"}
        asChild={asChild}
        {...props}
      >
        {React.cloneElement(child, {
          className: cn("flex items-center gap-2", (child.props as { className?: string })?.className),
          children: (
            <>
              <Icon className="h-4 w-4" />
              {(child.props as { children?: React.ReactNode })?.children}
            </>
          ),
        })}
      </Button>
    );
  }

  return (
    <Button
      className={cn(variant !== "default" && variantClasses[variant], className)}
      variant={variant === "outline" ? "outline" : "default"}
      asChild={asChild}
      {...props}
    >
      {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
      {children}
    </Button>
  );
}

