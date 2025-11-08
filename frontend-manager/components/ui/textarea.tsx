/**
 * Textarea Component
 * 
 * Multi-line text input component with consistent styling.
 * 
 * @module components/ui/textarea
 * @example
 * <Textarea placeholder="Enter description" />
 */
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Textarea Props Interface
 * 
 * @interface TextareaProps
 * @extends {React.TextareaHTMLAttributes<HTMLTextAreaElement>}
 * @property {string} [placeholder] - Placeholder text
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
}

/**
 * Textarea Component
 * 
 * Multi-line text input with consistent styling and focus states.
 * 
 * @param {TextareaProps} props - Component props
 * @returns {JSX.Element} Textarea component
 * 
 * @example
 * <Textarea placeholder="Enter description" rows={4} />
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full  border border-border bg-background px-3 py-2 text-base text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
