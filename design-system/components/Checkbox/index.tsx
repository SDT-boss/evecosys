/**
 * Design System primitive: Checkbox
 *
 * Multi-select control for forms, table row selection, and filter panels.
 *
 * Checked state: Cyber Jade Strong (#007069) fill with white checkmark —
 * same Jade anchor used across all primary interactive states.
 * Focus ring: Cyber Jade (#008684) — consistent with Button and Input.
 * Disabled: explicit grey tokens (not opacity) for WCAG non-text contrast.
 *
 * Always pair with a Label component:
 *   <div className="flex items-center gap-2">
 *     <Checkbox id="alerts" />
 *     <Label htmlFor="alerts">Email alerts</Label>
 *   </div>
 *
 * For table row selection, use size="sm" (14px) to keep the cell tight.
 */

"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-[var(--ds-radius-sm)]",
      "border border-[var(--ds-color-neutral-grey-20)]",
      "ring-offset-white",
      "focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-[var(--ds-color-brand-primary)] focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed",
      "disabled:border-[var(--ds-color-neutral-grey-10)]",
      "disabled:bg-[var(--ds-color-neutral-grey-05)]",
      "data-[state=checked]:bg-[var(--ds-color-brand-primary-strong)]",
      "data-[state=checked]:border-[var(--ds-color-brand-primary-strong)]",
      "data-[state=checked]:text-white",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
