"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TextButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "neutral" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

const variantClasses = {
  neutral: "text-text hover:bg-secondary/20 hover:text-text",
  ghost: "text-text hover:bg-background hover:text-text",
  link: "text-accent hover:text-accent/80 underline-offset-4 hover:underline",
};

export const TextButton: React.FC<TextButtonProps> = ({
  children,
  onClick,
  variant = "neutral",
  size = "md",
  disabled = false,
  className,
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-normal transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </button>
  );
};
