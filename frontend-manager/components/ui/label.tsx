/**
 * Label Component
 * 
 * Label component built on Radix UI Label primitive.
 * Used for form field labels with consistent styling.
 * 
 * @module components/ui/label
 * @example
 * <Label htmlFor="email">Email</Label>
 */
"use client"

import * as LabelPrimitive from "@radix-ui/react-label"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Label Component
 * 
 * Form label with consistent styling.
 * 
 * @param {React.ComponentProps<typeof LabelPrimitive.Root>} props - Label props
 * @returns {JSX.Element} Label component
 * 
 * @example
 * <Label htmlFor="email">Email Address</Label>
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-base leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
