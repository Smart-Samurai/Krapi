import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0 rounded-md border border-secondary bg-background px-4 py-3 text-base text-text shadow-sm transition-all outline-none placeholder:text-text/70 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-base file:font-medium file:text-text disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500",
        className
      )}
      {...props}
    />
  );
}

export { Input };
