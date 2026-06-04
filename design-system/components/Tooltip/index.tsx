/**
 * Design System primitive: Tooltip
 *
 * Non-interactive contextual label that appears on hover or focus.
 * Use for:
 *   - Icon buttons with no visible label (action menus, filter toggles)
 *   - Truncated text in table cells
 *   - Data values needing supplemental context (e.g. "Efficiency: 4.2 mi/kWh")
 *   - Status badges where space is too tight for the full label
 *
 * Do NOT use Tooltip for critical information — it is not visible on
 * touch devices and disappears on mouse-out.
 *
 * Panel: ink bg (#0B0F0E), white text — inverted from the UI surface for
 * clear separation. This follows Apple HIG tooltip conventions: dark label,
 * high contrast, no border, small shadow.
 * Border radius: ds-radius-sm (4px) — tighter than cards/modals.
 * Animation: fade + zoom via tailwindcss-animate.
 *
 * Always wrap the app in <TooltipProvider> (typically at root layout level).
 *
 * Sub-components: TooltipProvider, Tooltip, TooltipTrigger, TooltipContent
 */

"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden",
        "rounded-[var(--ds-radius-sm)]",
        "bg-[var(--ds-color-neutral-ink)] px-3 py-1.5",
        "text-[var(--ds-font-size-xs)] text-white font-[var(--ds-font-weight-medium)]",
        "[box-shadow:var(--ds-shadow-md)]",
        "animate-in fade-in-0 zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
