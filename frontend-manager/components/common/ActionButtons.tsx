"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  children: ReactNode;
  className?: string;
}

export function ActionButtons({ 
  children, 
  className = "" 
}: ActionButtonsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}

interface ActionButtonProps {
  children: ReactNode;
  variant?: "add" | "edit" | "delete" | "default" | "outline";
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  asChild?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function ActionButton({
  children,
  variant = "default",
  icon: Icon,
  onClick,
  disabled = false,
  asChild = false,
  className = "",
  size = "default",
}: ActionButtonProps) {
  const variantClasses = {
    add: "btn-add",
    edit: "btn-edit",
    delete: "btn-delete",
    default: "",
    outline: "",
  };

  const buttonVariant = variant === "outline" ? "outline" : 
    variant === "delete" ? "destructive" : 
    variant === "edit" ? "secondary" : "default";

  return (
    <Button
      variant={buttonVariant}
      size={size}
      className={`${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      asChild={asChild}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Button>
  );
}
