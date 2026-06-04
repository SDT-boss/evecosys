/**
 * Design System primitive: Label
 *
 * Accessible form label built on Radix UI Label. Associates with any
 * form control via htmlFor and reflects the control's disabled state
 * automatically via the peer pattern.
 *
 * Typography: ds-font-size-sm / ds-font-weight-medium / ds-color-neutral-ink.
 * Disabled peer: reduces to ds-color-neutral-grey-40 (not opacity-70 — explicit
 * token keeps the disabled state legible against all backgrounds).
 *
 * Usage: always pair with Input, Select, Checkbox, RadioGroupItem, or Switch.
 * Place above the control with ds-space-xs gap.
 */

"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-[var(--ds-font-size-sm)] font-[var(--ds-font-weight-medium)]",
      "text-[var(--ds-color-neutral-ink)] leading-none",
      "peer-disabled:cursor-not-allowed peer-disabled:text-[var(--ds-color-neutral-grey-40)]",
      className
    )}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
