/**
 * Design System molecule: OnboardingCard (custom — EVEcosys)
 *
 * Step-based onboarding card used during first-run flows for all role types:
 * Manager setup, Driver vehicle assignment, and Admin organisation review.
 *
 * Anatomy:
 *   stepLabel   — "Step 1 of 3" pill in Jade at the top
 *   icon        — 48×48 icon in a Volt Green-tinted circle (optional)
 *   title       — ds-font-size-2xl / bold / ink
 *   description — ds-font-size-base / grey-60
 *   action      — primary CTA button (Volt Green)
 *   secondaryAction — ghost / skip action (optional)
 *
 * The card uses ds-shadow-md to stand out from the page background during
 * the focused onboarding flow. Max-width 480px by default.
 *
 * Usage:
 *   <OnboardingCard
 *     step={1}
 *     totalSteps={3}
 *     title="Set up your fleet"
 *     description="Add your first vehicles to start tracking routes and energy usage."
 *     icon={<Car />}
 *     action={<Button>Add vehicles</Button>}
 *     secondaryAction={<Button variant="ghost">Skip for now</Button>}
 *   />
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface OnboardingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  step?: number
  totalSteps?: number
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
}

export function OnboardingCard({
  step,
  totalSteps,
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  ...props
}: OnboardingCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[480px] rounded-[var(--ds-radius-lg)]",
        "border border-[var(--ds-color-neutral-grey-20)] bg-white",
        "[box-shadow:var(--ds-shadow-md)]",
        "p-[var(--ds-space-xl)]",
        "flex flex-col gap-[var(--ds-space-lg)]",
        className
      )}
      {...props}
    >
      {/* Step pill */}
      {step !== undefined && totalSteps !== undefined && (
        <div className="flex items-center gap-[var(--ds-space-sm)]">
          <span
            className={cn(
              "inline-flex items-center rounded-[var(--ds-radius-full)]",
              "px-3 py-1 text-xs font-semibold",
              "bg-[color-mix(in_srgb,var(--ds-color-brand-primary)_10%,white)]",
              "text-[var(--ds-color-brand-primary)]",
              "border border-[color-mix(in_srgb,var(--ds-color-brand-primary)_25%,transparent)]"
            )}
          >
            Step {step} of {totalSteps}
          </span>
          {/* Progress dots */}
          <div className="flex gap-[var(--ds-space-xs)]">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-[var(--ds-radius-full)]",
                  i < step
                    ? "bg-[var(--ds-color-brand-primary)] w-4"
                    : "bg-[var(--ds-color-neutral-grey-20)] w-1.5"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Icon + text */}
      <div className="flex flex-col gap-[var(--ds-space-md)]">
        {icon && (
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center",
              "rounded-[var(--ds-radius-lg)]",
              "bg-[color-mix(in_srgb,var(--ds-color-brand-secondary)_15%,white)]",
              "text-[var(--ds-color-brand-secondary-strong)]"
            )}
          >
            <span className="[&>svg]:h-7 [&>svg]:w-7">{icon}</span>
          </div>
        )}

        <div className="flex flex-col gap-[var(--ds-space-xs)]">
          <h2
            className={cn(
              "text-[var(--ds-font-size-2xl)] font-[var(--ds-font-weight-bold)]",
              "leading-[var(--ds-font-line-height-tight)] text-[var(--ds-color-neutral-ink)]"
            )}
          >
            {title}
          </h2>
          {description && (
            <p
              className={cn(
                "text-[var(--ds-font-size-base)]",
                "leading-[var(--ds-font-line-height-normal)]",
                "text-[var(--ds-color-neutral-grey-60)]"
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col gap-[var(--ds-space-sm)]">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
