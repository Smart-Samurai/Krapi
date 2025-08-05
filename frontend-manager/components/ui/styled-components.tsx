import React from "react";
import { cn } from "@/lib/utils";

// Styled Button Component
interface StyledButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const StyledButton = React.forwardRef<
  HTMLButtonElement,
  StyledButtonProps
>(
  (
    { className, variant = "primary", size = "md", children, ...props },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm";

    const variantClasses = {
      primary:
        "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary shadow-primary/25",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/90 focus:ring-secondary shadow-secondary/25",
      accent:
        "bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent shadow-accent/25",
      ghost: "text-foreground hover:bg-muted focus:ring-muted",
      outline:
        "border border-border bg-background text-foreground hover:bg-muted hover:border-border focus:ring-border",
    };

    const sizeClasses = {
      sm: "h-8 px-3 py-1.5 text-sm",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
StyledButton.displayName = "StyledButton";

// Styled Input Component
interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const StyledInput = React.forwardRef<HTMLInputElement, StyledInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 shadow-sm",
            error &&
              "border-destructive focus:ring-destructive focus:border-destructive",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
StyledInput.displayName = "StyledInput";

// Styled Card Component
interface StyledCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const StyledCard = React.forwardRef<HTMLDivElement, StyledCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
StyledCard.displayName = "StyledCard";

// Styled List Component
interface StyledListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const StyledList = React.forwardRef<HTMLDivElement, StyledListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {children}
      </div>
    );
  }
);
StyledList.displayName = "StyledList";

// Styled List Item Component
interface StyledListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  active?: boolean;
}

export const StyledListItem = React.forwardRef<
  HTMLDivElement,
  StyledListItemProps
>(({ className, children, active = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border border-border transition-colors duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-background text-foreground hover:bg-muted hover:border-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
StyledListItem.displayName = "StyledListItem";

// Styled Badge Component
interface StyledBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "accent"
    | "success"
    | "error"
    | "warning";
}

export const StyledBadge = React.forwardRef<HTMLSpanElement, StyledBadgeProps>(
  ({ className, children, variant = "primary", ...props }, ref) => {
    const variantClasses = {
      primary: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      accent: "bg-accent text-accent-foreground",
      success: "bg-primary text-primary-foreground",
      error: "bg-destructive text-destructive-foreground",
      warning: "bg-yellow-600 text-white",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
StyledBadge.displayName = "StyledBadge";

// Styled Menu Item Component
interface StyledMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  active?: boolean;
}

export const StyledMenuItem = React.forwardRef<
  HTMLDivElement,
  StyledMenuItemProps
>(({ className, children, active = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-200 cursor-pointer",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-background text-foreground hover:bg-muted",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
StyledMenuItem.displayName = "StyledMenuItem";

// Styled Section Component
interface StyledSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const StyledSection = React.forwardRef<
  HTMLDivElement,
  StyledSectionProps
>(({ className, children, title, description, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("space-y-4", className)} {...props}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
});
StyledSection.displayName = "StyledSection";

// Styled Grid Component
interface StyledGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

export const StyledGrid = React.forwardRef<HTMLDivElement, StyledGridProps>(
  ({ className, children, cols = 1, ...props }, ref) => {
    const gridClasses = {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    };

    return (
      <div
        ref={ref}
        className={cn("grid gap-4", gridClasses[cols], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
StyledGrid.displayName = "StyledGrid";
