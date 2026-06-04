/**
 * Design System primitive: Alert
 *
 * Inline contextual message banner. Renders in the document flow — not a
 * toast or overlay. Use for:
 *   - Form validation summaries
 *   - Data fetch errors in panels
 *   - Important notices above page content
 *
 * EVEcosys variants:
 *   `default`      — Jade left-border, grey-05 bg. Informational / neutral.
 *   `success`      — Volt Green left-border. Confirms a completed action.
 *   `warning`      — Amber left-border. Requires attention, not urgent.
 *   `destructive`  — Error-red left-border + text. Requires immediate action.
 *
 * Layout: 4px left border accent + 16px padding + icon slot (absolute,
 * top-left). If an icon is passed as a direct child, it aligns to the
 * top-left and all text children are indented 28px automatically.
 *
 * Sub-components: Alert, AlertTitle, AlertDescription
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  [
    "relative w-full rounded-[var(--ds-radius-md)] border-l-4 p-[var(--ds-space-md)]",
    "bg-[var(--ds-color-neutral-grey-05)]",
    "[&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px]",
    "[&>svg]:absolute [&>svg]:left-[var(--ds-space-md)] [&>svg]:top-[var(--ds-space-md)]",
  ],
  {
    variants: {
      variant: {
        default:
          "border-l-[var(--ds-color-brand-primary)] text-[var(--ds-color-neutral-ink)] [&>svg]:text-[var(--ds-color-brand-primary)]",
        success:
          "border-l-[var(--ds-color-brand-secondary)] text-[var(--ds-color-neutral-ink)] [&>svg]:text-[var(--ds-color-brand-secondary-strong)]",
        warning:
          "border-l-[var(--ds-color-status-warning)] text-[var(--ds-color-neutral-ink)] [&>svg]:text-[var(--ds-color-status-warning)]",
        destructive:
          "border-l-[var(--ds-color-status-error)] text-[var(--ds-color-status-error)] [&>svg]:text-[var(--ds-color-status-error)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn(
        "mb-1 font-[var(--ds-font-weight-semibold)] text-[var(--ds-font-size-sm)] leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-[var(--ds-font-size-sm)] [&_p]:leading-[var(--ds-font-line-height-relaxed)]", className)}
      {...props}
    />
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
