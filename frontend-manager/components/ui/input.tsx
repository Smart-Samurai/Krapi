/**
 * Input Component
 * 
 * Text input component with consistent styling and focus states.
 * 
 * @module components/ui/input
 * @example
 * <Input type="text" placeholder="Enter text" />
 * <Input type="email" placeholder="Email" />
 */
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input Component
 * 
 * Text input with consistent styling, focus states, and validation support.
 * 
 * @param {React.ComponentProps<"input">} props - Input props
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.type] - Input type (text, email, password, etc.)
 * @returns {JSX.Element} Input component
 * 
 * @example
 * <Input type="text" placeholder="Enter name" />
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0  border border-border bg-background px-4 py-3 text-base text-foreground shadow-sm transition-all outline-none placeholder:text-muted-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500",
        className
      )}
      {...props}
    />
  );
}

export { Input };
