/**
 * Separator Component
 * 
 * Separator/divider component built on Radix UI Separator primitive.
 * 
 * @module components/ui/separator
 * @example
 * <Separator orientation="horizontal" />
 * <Separator orientation="vertical" />
 */
"use client"

import * as SeparatorPrimitive from "@radix-ui/react-separator"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Separator Component
 * 
 * Visual separator/divider line.
 * 
 * @param {React.ComponentProps<typeof SeparatorPrimitive.Root>} props - Separator props
 * @param {"horizontal" | "vertical"} [props.orientation="horizontal"] - Separator orientation
 * @param {boolean} [props.decorative=true] - Whether separator is decorative
 * @returns {JSX.Element} Separator component
 * 
 * @example
 * <Separator orientation="horizontal" />
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
