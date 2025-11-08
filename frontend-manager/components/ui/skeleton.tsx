/**
 * Skeleton Component
 * 
 * Skeleton loader component for showing loading states.
 * 
 * @module components/ui/skeleton
 * @example
 * <Skeleton className="h-4 w-32" />
 */
import { cn } from "@/lib/utils";

/**
 * Skeleton Component
 * 
 * Loading skeleton placeholder with animated pulse effect.
 * 
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} Skeleton component
 * 
 * @example
 * <Skeleton className="h-4 w-32" />
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse  bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
