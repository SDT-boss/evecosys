/**
 * Design System primitive: Button
 *
 * The foundational interactive element for EVEcosys. Variant semantics:
 *   - `default`     — Volt Green CTA (#96D02C bg, ink label). The signature action.
 *                     Use at most once as the dominant CTA per view.
 *   - `secondary`   — Cyber Jade structural action (#007069 bg, white label).
 *                     For save, confirm, and secondary page-level actions.
 *   - `outline`     — Low-noise bordered action. Jade text on transparent bg.
 *   - `ghost`       — Minimal tertiary action. Jade text, no border.
 *   - `destructive` — Irreversible actions only (delete, revoke). Red bg.
 *   - `link`        — Inline text action. Jade underline on hover.
 *
 * All variants share the Cyber Jade focus ring (--ds-color-brand-primary)
 * for consistent keyboard-navigation affordance. Disabled state uses
 * explicit grey tokens instead of opacity so it meets WCAG non-text contrast.
 *
 * Icon placement: icons go LEFT of the label (gap-2). Icon-only buttons
 * use size="icon" and must carry a title or aria-label for accessibility.
 *
 * Source: seeded from shadcn/ui button. Do not edit /app/components/ui/button.tsx —
 * make changes here and import from @evecosys/design-system in the app.
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base — layout, typography, transitions, focus ring, disabled
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--ds-radius-md)] text-sm font-semibold",
    "transition-colors duration-(--ds-motion-duration-base)",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-[var(--ds-color-brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    "disabled:pointer-events-none disabled:bg-[var(--ds-color-neutral-grey-10)]",
    "disabled:text-[var(--ds-color-neutral-grey-40)] disabled:opacity-100",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Volt Green CTA — primary page action */
        default:
          "bg-[var(--ds-color-brand-secondary)] text-[var(--ds-color-neutral-ink)] hover:bg-[var(--ds-color-brand-secondary-strong)]",
        /** Cyber Jade — structural confirm / save */
        secondary:
          "bg-[var(--ds-color-brand-primary-strong)] text-white hover:bg-[var(--ds-color-brand-primary)]",
        /** Ghost with border — low-noise tertiary */
        outline:
          "border border-[var(--ds-color-neutral-grey-20)] bg-transparent text-[var(--ds-color-brand-primary)] hover:bg-[var(--ds-color-neutral-grey-05)]",
        /** No border, no background — minimal tertiary */
        ghost:
          "bg-transparent text-[var(--ds-color-brand-primary)] hover:bg-[var(--ds-color-neutral-grey-10)]",
        /** Irreversible actions only */
        destructive:
          "bg-[var(--ds-color-status-error)] text-white hover:opacity-90",
        /** Inline text link */
        link: "text-[var(--ds-color-brand-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
