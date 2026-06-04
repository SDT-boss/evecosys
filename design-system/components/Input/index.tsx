/**
 * Design System primitive: Input
 *
 * Single-line text input covering the full EVEcosys state set:
 *
 *   default   — grey-20 border (#C4CBCA), white background, ink text
 *   focus     — Jade border + 3px Jade halo (rgba(0,134,132,0.18)).
 *               The halo replaces the ring-offset pattern so it blends
 *               cleanly with any background colour.
 *   filled    — same as default; the grey-60 border signals content presence
 *               at the form level, not in this primitive.
 *   disabled  — grey-05 background, grey-40 text, not-allowed cursor.
 *               No opacity reduction — explicit tokens are more legible.
 *   error     — callers add error styles via aria-invalid="true" and a
 *               className override (error border + shadow use status-error
 *               token; see DESIGN.md Input spec).
 *
 * Focus ring colour (--ds-color-brand-primary) matches Button's focus ring
 * for consistent keyboard affordance across all interactive elements.
 *
 * Source: seeded from shadcn/ui input. Do not edit /app/components/ui/input.tsx.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout & shape
          "flex h-10 w-full px-3 py-2",
          "rounded-[var(--ds-radius-md)]",
          // Default state
          "border border-[var(--ds-color-neutral-grey-20)]",
          "bg-white text-[var(--ds-color-neutral-ink)]",
          "text-base md:text-sm",
          // Placeholder
          "placeholder:text-[var(--ds-color-neutral-grey-40)]",
          // File input resets
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "file:text-[var(--ds-color-neutral-ink)]",
          // Focus — Jade border + soft halo, no default ring offset
          "focus-visible:outline-none",
          "focus-visible:border-[var(--ds-color-brand-primary)]",
          "focus-visible:shadow-[0_0_0_3px_rgba(0,134,132,0.18)]",
          // Disabled
          "disabled:cursor-not-allowed",
          "disabled:bg-[var(--ds-color-neutral-grey-05)]",
          "disabled:text-[var(--ds-color-neutral-grey-40)]",
          "disabled:opacity-100",
          // Error — applied by caller via aria-invalid + className
          "aria-[invalid=true]:border-[var(--ds-color-status-error)]",
          "aria-[invalid=true]:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
