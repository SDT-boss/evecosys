/**
 * Design System primitive: Separator
 *
 * Visual and semantic divider between sections of content.
 * Uses ds-color-neutral-grey-20 (#C4CBCA) — the standard border token —
 * so it stays consistent with card borders, input borders, and table rules.
 *
 * orientation="horizontal" (default) — full-width 1px rule, use between
 *   stacked sections (card header / content / footer, settings groups).
 * orientation="vertical" — full-height 1px rule, use between columns
 *   in toolbars or inline split layouts.
 *
 * Renders as role="separator" for screen readers when decorative=false.
 * Set decorative=true (default) when the separation is purely visual.
 */

"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-[var(--ds-color-neutral-grey-20)]",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
))
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
