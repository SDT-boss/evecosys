/**
 * Design System primitive: Badge
 *
 * Compact status indicator for labelling entities, states, and roles.
 * Sized for inline use alongside text or inside table cells.
 *
 * EVEcosys variants:
 *   `default`     — Cyber Jade bg (#007069), white label.
 *                   Use for: Active, Online, Confirmed, assigned roles.
 *   `volt`        — Volt Green bg (#96D02C), ink label.
 *                   Use for: Charging, Live, Healthy, positive energy states.
 *   `secondary`   — grey-10 bg, ink label. Neutral / inactive / info.
 *   `outline`     — grey-20 border, ink label. Subtle labelling, no fill.
 *   `destructive` — status-error bg (#EF4444), white label.
 *                   Use for: Offline, Alert, Overdue, critical states.
 *
 * The `volt` variant is an EVEcosys addition — it does not exist in the
 * base shadcn badge and should not be back-ported to /app/components/ui/badge.tsx.
 *
 * Focus ring uses --ds-color-brand-primary (Jade) for keyboard accessibility.
 *
 * Source: seeded from shadcn/ui badge. Do not edit /app/components/ui/badge.tsx.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-[var(--ds-radius-full)]",
    "border px-2.5 py-0.5 text-xs font-semibold",
    "transition-colors duration-[var(--ds-motion-duration-fast)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--ds-color-brand-primary)] focus:ring-offset-2",
  ],
  {
    variants: {
      variant: {
        /** Cyber Jade — active / confirmed / online */
        default:
          "border-transparent bg-[var(--ds-color-brand-primary-strong)] text-white hover:bg-[var(--ds-color-brand-primary)]",
        /** Volt Green — charging / live / healthy (EVEcosys-specific) */
        volt:
          "border-transparent bg-[var(--ds-color-brand-secondary)] text-[var(--ds-color-neutral-ink)] hover:opacity-90",
        /** Neutral grey — inactive / informational */
        secondary:
          "border-transparent bg-[var(--ds-color-neutral-grey-10)] text-[var(--ds-color-neutral-ink)] hover:bg-[var(--ds-color-neutral-grey-20)]",
        /** Bordered — subtle labelling, no fill */
        outline:
          "border-[var(--ds-color-neutral-grey-20)] bg-transparent text-[var(--ds-color-neutral-ink)]",
        /** Error red — offline / alert / critical */
        destructive:
          "border-transparent bg-[var(--ds-color-status-error)] text-white hover:opacity-90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
