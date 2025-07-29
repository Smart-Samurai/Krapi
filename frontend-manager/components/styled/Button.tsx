import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-bold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-primary text-background hover:bg-primary/90",
        secondary: "bg-secondary text-text hover:bg-secondary/90",
        accent: "bg-accent text-background hover:bg-accent/90",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline:
          "border border-primary bg-background text-primary hover:bg-primary hover:text-background",
        ghost: "text-text hover:bg-secondary/20",
        link: "text-accent underline-offset-4 hover:underline",
        confirm: "bg-green-600 text-white hover:bg-green-700",
        cancel: "bg-gray-500 text-white hover:bg-gray-600",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
