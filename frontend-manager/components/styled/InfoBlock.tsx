import React from "react";
import { cn } from "@/lib/utils";

interface InfoBlockProps {
  children: React.ReactNode;
  variant?: "default" | "info" | "warning" | "success" | "error";
  title?: string;
  className?: string;
  icon?: React.ReactNode;
}

const variantClasses = {
  default: "bg-card border border-primary",
  info: "bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  warning:
    "bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
  success:
    "bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800",
  error: "bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800",
};

const variantTextClasses = {
  default: "text-foreground",
  info: "text-blue-800 dark:text-blue-200",
  warning: "text-yellow-800 dark:text-yellow-200",
  success: "text-green-800 dark:text-green-200",
  error: "text-red-800 dark:text-red-200",
};

export const InfoBlock: React.FC<InfoBlockProps> = ({
  children,
  variant = "default",
  title,
  className,
  icon,
}) => {
  return (
    <div
      className={cn(
        "rounded-lg p-4 shadow-sm",
        variantClasses[variant],
        className
      )}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-3">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {title && (
            <h3
              className={cn("text-lg font-bold", variantTextClasses[variant])}
            >
              {title}
            </h3>
          )}
        </div>
      )}
      <div className={cn("text-base", variantTextClasses[variant])}>
        {children}
      </div>
    </div>
  );
};
