"use client";

import React from "react";
import { IconType } from "react-icons";

import { cn } from "@/lib/utils";

interface IconButtonProps {
  icon: IconType;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "accent" | "ghost";
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: "button" | "submit" | "reset";
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

const variantClasses = {
  primary: "bg-primary text-background hover:bg-primary/90",
  secondary: "bg-secondary text-text hover:bg-secondary/90",
  accent: "bg-accent text-background hover:bg-accent/90",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  size = "md",
  variant = "primary",
  disabled = false,
  className,
  title,
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded-full flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Icon size={iconSizes[size]} />
    </button>
  );
};
