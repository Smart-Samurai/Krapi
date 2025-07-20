import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-background-300 bg-background-50 px-3 py-1 text-base text-text-900 shadow-sm transition-all outline-none placeholder:text-text-500 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-700 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background-50",
        "dark:border-background-300 dark:bg-background-200 dark:text-text-900 dark:placeholder:text-text-500 dark:file:text-text-700 dark:focus:ring-offset-background-50",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-500/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
