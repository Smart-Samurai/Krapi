/**
 * Button Component
 * 
 * Button component built on Radix UI Slot with variant and size support.
 * Supports multiple variants (default, destructive, outline, secondary, ghost, link) and sizes.
 * 
 * @module components/ui/button
 * @example
 * <Button variant="default" size="md">Click me</Button>
 * <Button variant="destructive" size="sm">Delete</Button>
 */
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Button Variants
 * 
 * @constant {Function} buttonVariants
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap  text-base font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8  gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10  px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Button Component
 * 
 * Button with variants and sizes. Can render as a button or as a child element (asChild).
 * 
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @param {"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"} [props.variant="default"] - Button variant
 * @param {"default" | "sm" | "lg" | "icon"} [props.size="default"] - Button size
 * @param {boolean} [props.asChild=false] - Render as child element
 * @returns {JSX.Element} Button component
 * 
 * @example
 * <Button variant="default" size="md" onClick={handleClick}>Click me</Button>
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
