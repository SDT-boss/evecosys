/**
 * Design System primitive: Textarea
 *
 * Multi-line text input for longer content — trip notes, alert descriptions,
 * vehicle maintenance logs, and user-facing messages.
 *
 * Shares the same state tokens as Input for visual consistency:
 *   default  — grey-20 border, white bg, ink text
 *   focus    — Jade border + 3px Jade halo (rgba(0,134,132,0.18))
 *   disabled — grey-05 bg, grey-40 text, not-allowed cursor
 *   error    — red border + red halo via aria-invalid="true"
 *
 * min-height: 80px (5 lines). Override via className:
 *   "min-h-[120px]" for notes fields
 *   "min-h-[200px]" for detailed descriptions
 *
 * resize: vertical only (default Tailwind behaviour). Add "resize-none"
 * to disable when height is fixed by layout.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full px-3 py-2",
        "rounded-[var(--ds-radius-md)]",
        "border border-[var(--ds-color-neutral-grey-20)]",
        "bg-white text-[var(--ds-color-neutral-ink)]",
        "text-base md:text-sm leading-[var(--ds-font-line-height-relaxed)]",
        "placeholder:text-[var(--ds-color-neutral-grey-40)]",
        "focus-visible:outline-none",
        "focus-visible:border-[var(--ds-color-brand-primary)]",
        "focus-visible:shadow-[0_0_0_3px_rgba(0,134,132,0.18)]",
        "disabled:cursor-not-allowed",
        "disabled:bg-[var(--ds-color-neutral-grey-05)]",
        "disabled:text-[var(--ds-color-neutral-grey-40)]",
        "disabled:opacity-100",
        "aria-[invalid=true]:border-[var(--ds-color-status-error)]",
        "aria-[invalid=true]:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
