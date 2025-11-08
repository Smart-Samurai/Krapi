/**
 * Progress Component
 * 
 * Progress bar component built on Radix UI Progress primitive.
 * Displays progress as a percentage with animated bar.
 * 
 * @module components/ui/progress
 * @example
 * <Progress value={50} />
 */
"use client"

import * as ProgressPrimitive from "@radix-ui/react-progress"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Progress Component
 * 
 * Progress bar showing completion percentage.
 * 
 * @param {React.ComponentProps<typeof ProgressPrimitive.Root>} props - Progress props
 * @param {number} [props.value] - Progress value (0-100)
 * @returns {JSX.Element} Progress component
 * 
 * @example
 * <Progress value={75} />
 */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden ",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
