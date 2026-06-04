/**
 * Design System primitive: Spinner (custom — not in shadcn)
 *
 * Indeterminate loading indicator for actions with unknown duration.
 * Use Skeleton for content with known shape; use Spinner for:
 *   - Button loading states (size="sm" inside the button)
 *   - Full-page or full-panel data fetches with no predictable layout
 *   - Form submission feedback
 *
 * Sizes:
 *   sm  — 16px  (inline, inside buttons or table cells)
 *   md  — 24px  (default, inside cards or panels)
 *   lg  — 40px  (full-section loading state)
 *
 * Colour: ds-color-brand-primary (Cyber Jade) by default. Override via
 * className for contextual use (e.g. white spinner inside a Jade button).
 *
 * Accessibility: always pair with an sr-only label ("Loading…") or an
 * aria-label on the parent container.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

type SpinnerSize = "sm" | "md" | "lg"

const sizeMap: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
}

interface SpinnerProps extends React.SVGAttributes<SVGElement> {
  size?: SpinnerSize
}

function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin text-[var(--ds-color-brand-primary)]",
        sizeMap[size],
        className
      )}
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

export { Spinner, type SpinnerProps }
