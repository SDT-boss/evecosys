/**
 * Design System primitive: Card
 *
 * Surface container for a discrete unit of content — fleet stat, vehicle
 * summary, alert row, driver profile, KPI panel, etc.
 *
 * Uses a 1px grey-20 border, white background, and a sm shadow
 * (--ds-shadow-sm) to lift cleanly from the grey-05 page background.
 * Border radius is --ds-radius-lg (8px) per the EVEcosys card spec.
 *
 * Sub-components:
 *   CardHeader       — flex column, 24px padding, 6px internal gap
 *   CardTitle        — 2xl semibold heading, tight leading, ink colour
 *   CardDescription  — sm body text in grey-60
 *   CardContent      — 24px padding, 0 top (header supplies it)
 *   CardFooter       — flex row, 24px padding, 0 top
 *
 * All sub-components accept className for extension. Do not apply one-off
 * background or border overrides directly — graduate a new card variant here.
 *
 * Source: seeded from shadcn/ui card. Do not edit /app/components/ui/card.tsx.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--ds-radius-lg)] border border-[var(--ds-color-neutral-grey-20)]",
        "bg-white text-[var(--ds-color-neutral-ink)]",
        "[box-shadow:var(--ds-shadow-sm)]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-[var(--ds-space-xs)] p-[var(--ds-space-lg)]", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "text-[var(--ds-font-size-2xl)] font-[var(--ds-font-weight-semibold)]",
        "leading-[var(--ds-font-line-height-tight)] tracking-tight",
        "text-[var(--ds-color-neutral-ink)]",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-grey-60)]",
        className
      )}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-[var(--ds-space-lg)] pt-0", className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-[var(--ds-space-lg)] pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
