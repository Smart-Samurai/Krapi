/**
 * Aspect Ratio Component
 * 
 * Aspect ratio component built on Radix UI Aspect Ratio primitives.
 * Maintains a consistent aspect ratio for content regardless of container size.
 * 
 * @module components/ui/aspect-ratio
 * @example
 * <AspectRatio ratio={16 / 9}>
 *   <img src="image.jpg" alt="Image" />
 * </AspectRatio>
 */
"use client"

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
}

export { AspectRatio }
