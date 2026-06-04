/**
 * Design System primitive: RadioGroup
 *
 * Mutually exclusive selection control. Use for:
 *   - Role assignment (Manager / Driver / Admin)
 *   - Notification preferences (Email / SMS / None)
 *   - Report frequency (Daily / Weekly / Monthly)
 *   - Any setting where exactly one option must be chosen
 *
 * Selected indicator: Cyber Jade Strong fill — same primary anchor as
 * Checkbox and Switch for visual consistency across all selection controls.
 * Focus ring: Cyber Jade (#008684).
 *
 * Always pair each RadioGroupItem with a Label:
 *   <RadioGroup defaultValue="manager">
 *     <div className="flex items-center gap-2">
 *       <RadioGroupItem value="manager" id="r-manager" />
 *       <Label htmlFor="r-manager">Manager</Label>
 *     </div>
 *   </RadioGroup>
 */

"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root className={cn("grid gap-[var(--ds-space-sm)]", className)} {...props} ref={ref} />
))
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "aspect-square h-4 w-4 rounded-[var(--ds-radius-full)]",
      "border border-[var(--ds-color-neutral-grey-20)]",
      "text-[var(--ds-color-brand-primary-strong)]",
      "ring-offset-white",
      "focus:outline-none focus-visible:ring-2",
      "focus-visible:ring-[var(--ds-color-brand-primary)] focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-[var(--ds-color-brand-primary-strong)]",
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="h-2.5 w-2.5 fill-[var(--ds-color-brand-primary-strong)] text-[var(--ds-color-brand-primary-strong)]" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
))
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
