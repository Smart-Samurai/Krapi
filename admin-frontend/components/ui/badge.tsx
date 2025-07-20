import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-50 dark:focus-visible:ring-offset-background-50 transition-all overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-500 text-white [a&]:hover:bg-primary-600 dark:bg-primary-500 dark:text-background-50 dark:[a&]:hover:bg-primary-400",
        secondary:
          "border-transparent bg-secondary-500 text-background-50 [a&]:hover:bg-secondary-600 dark:bg-secondary-500 dark:text-background-50 dark:[a&]:hover:bg-secondary-400",
        destructive:
          "border-transparent bg-red-600 text-white [a&]:hover:bg-red-700 dark:bg-red-600 dark:[a&]:hover:bg-red-700",
        outline:
          "border-background-300 text-text-900 [a&]:hover:bg-background-100 dark:border-background-300 dark:text-text-50 dark:[a&]:hover:bg-background-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
