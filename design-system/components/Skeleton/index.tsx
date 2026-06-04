/**
 * Design System primitive: Skeleton
 *
 * Loading placeholder that mimics the shape of the content being fetched.
 * Use instead of spinners for content that has a known layout — tables,
 * cards, stat panels, and driver lists all benefit from skeleton loading
 * because it prevents cumulative layout shift and communicates shape to users.
 *
 * Colour: ds-color-neutral-grey-10 (#E6EAEA) with a pulse animation.
 * This sits above the page background (ds-color-neutral-grey-05) with enough
 * contrast to be visible while remaining unobtrusive.
 *
 * Usage:
 *   <Skeleton className="h-4 w-32" />           — single line
 *   <Skeleton className="h-10 w-10 rounded-full" /> — avatar
 *   <Skeleton className="h-40 w-full" />         — card body
 *
 * Compose multiple Skeleton elements to replicate the target layout exactly.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--ds-radius-md)]",
        "bg-[var(--ds-color-neutral-grey-10)]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
