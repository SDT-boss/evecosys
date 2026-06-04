/**
 * Design System molecule: EmptyState (custom — EVEcosys)
 *
 * Zero-data placeholder for tables, lists, and panels that have no content
 * to display. Critical for first-run experience and filtered-to-empty states.
 *
 * Anatomy (all optional except title):
 *   icon        — 48×48 icon in a Jade-tinted circle (grey-10 bg, Jade icon)
 *   title       — ds-font-size-lg / semibold / ink — what is empty
 *   description — ds-font-size-sm / grey-60 — why it's empty or what to do
 *   action      — primary Button (Volt Green CTA) or secondary Button
 *
 * EVEcosys usage patterns:
 *   No vehicles assigned:
 *     title="No vehicles yet", description="Add your first vehicle to start tracking.",
 *     action=<Button>Add vehicle</Button>
 *
 *   No alerts (positive):
 *     title="All clear", description="No active alerts for your fleet.",
 *     icon=<CheckCircle /> (override icon colour to Volt Green via className)
 *
 *   Search returned nothing:
 *     title="No results", description="Try adjusting your filters."
 *
 * Renders centred by default. For table-body empty state, wrap in a
 * <TableRow><TableCell colSpan={n}><EmptyState /></TableCell></TableRow>.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "gap-[var(--ds-space-md)] py-[var(--ds-space-3xl)] px-[var(--ds-space-xl)]",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--ds-radius-full)] bg-[var(--ds-color-neutral-grey-10)] text-[var(--ds-color-brand-primary)]">
          {icon}
        </div>
      )}

      <div className="flex flex-col gap-[var(--ds-space-xs)] max-w-xs">
        <h3 className="text-[var(--ds-font-size-lg)] font-[var(--ds-font-weight-semibold)] text-[var(--ds-color-neutral-ink)] leading-[var(--ds-font-line-height-tight)]">
          {title}
        </h3>
        {description && (
          <p className="text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-grey-60)] leading-[var(--ds-font-line-height-normal)]">
            {description}
          </p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  )
}

export { EmptyState, type EmptyStateProps }
