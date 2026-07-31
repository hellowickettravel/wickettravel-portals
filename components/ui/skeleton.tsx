import { cn } from "@/lib/utils"

/**
 * Skeleton — a calm placeholder, not a shimmer.
 *
 * `sunk` on `surface`, the control radius, and a slow pulse. Reduced motion
 * flattens the pulse globally (globals.css), leaving a plain grey block.
 * Give it the shape of the thing it stands in for; never more than a screenful.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-control bg-sunk", className)}
      {...props}
    />
  )
}

export { Skeleton }
