/**
 * Design System primitive: Progress
 *
 * Horizontal progress bar for deterministic loading and battery/capacity states.
 *
 * EVEcosys uses Progress for:
 *   - Battery level on vehicle cards (pair with BatteryIndicator for icon)
 *   - Charging session progress
 *   - Trip completion percentage
 *   - Data import / export operations
 *
 * Indicator colour defaults to ds-color-brand-primary (Cyber Jade) for
 * neutral progress. For semantic states:
 *   - Battery healthy: override indicator with ds-color-brand-secondary (Volt Green)
 *   - Battery warning: override with ds-color-status-warning
 *   - Battery critical: override with ds-color-status-error
 *
 * Track uses ds-color-neutral-grey-10 — the lightest surface token.
 * Height is 8px (h-2). Override via className for thicker bars (h-3, h-4).
 *
 * value: 0–100. Animates via CSS transform translateX for smooth updates.
 */

"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-[var(--ds-radius-full)]",
      "bg-[var(--ds-color-neutral-grey-10)]",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 rounded-[var(--ds-radius-full)]",
        "bg-[var(--ds-color-brand-primary)]",
        "transition-transform duration-(--ds-motion-duration-slow)",
        "[transition-timing-function:var(--ds-motion-easing-standard)]"
      )}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
