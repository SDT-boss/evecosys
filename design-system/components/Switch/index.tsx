/**
 * Design System primitive: Switch
 *
 * Binary toggle for settings and feature flags. Prefer Switch over Checkbox
 * when the action takes effect immediately (no form submission required),
 * e.g. "Enable email alerts", "Dark mode", "Live tracking".
 *
 * On state:  Cyber Jade Strong (#007069) track — confirms the feature is active
 *            with the same Jade anchor used for primary actions.
 * Off state: grey-20 track — clearly inactive, not disabled.
 * Thumb:     white, with shadow for depth.
 * Focus:     Jade ring (#008684) — consistent across all interactive controls.
 * Disabled:  cursor-not-allowed + explicit grey tokens, no opacity hack.
 *
 * Always pair with a Label:
 *   <div className="flex items-center gap-[var(--ds-space-sm)]">
 *     <Switch id="live-tracking" />
 *     <Label htmlFor="live-tracking">Live tracking</Label>
 *   </div>
 */

"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center",
      "rounded-[var(--ds-radius-full)] border-2 border-transparent",
      "transition-colors duration-[var(--ds-motion-duration-base)]",
      "focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-[var(--ds-color-brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
      "disabled:cursor-not-allowed",
      "disabled:data-[state=checked]:bg-[var(--ds-color-neutral-grey-20)]",
      "disabled:data-[state=unchecked]:bg-[var(--ds-color-neutral-grey-10)]",
      "data-[state=checked]:bg-[var(--ds-color-brand-primary-strong)]",
      "data-[state=unchecked]:bg-[var(--ds-color-neutral-grey-20)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-[var(--ds-radius-full)]",
        "bg-white shadow-lg ring-0",
        "transition-transform duration-[var(--ds-motion-duration-base)]",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
