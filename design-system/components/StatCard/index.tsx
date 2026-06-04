/**
 * Design System molecule: StatCard (custom — EVEcosys)
 *
 * KPI display card for fleet metrics, driver summaries, and energy dashboards.
 * The primary pattern for Manager and Admin dashboard grids.
 *
 * Anatomy:
 *   [icon]        — optional 40×40 icon container (Jade bg, white icon)
 *   label         — ds-font-size-sm / grey-60 / tracking-wide uppercase
 *   value         — ds-font-size-3xl / bold / ink
 *   unit          — ds-font-size-base / grey-60 (optional suffix: "kWh", "%", "km")
 *   trend         — optional delta indicator (↑ Volt Green / ↓ error-red / — grey)
 *   description   — ds-font-size-xs / grey-60 (optional context line)
 *
 * Trend direction: "up" | "down" | "neutral"
 * trendValue: string, e.g. "+12%" or "−3 vehicles"
 * trendLabel: string, e.g. "vs last week"
 *
 * Usage:
 *   <StatCard
 *     label="Fleet utilisation"
 *     value="84"
 *     unit="%"
 *     trend="up"
 *     trendValue="+6%"
 *     trendLabel="vs last week"
 *     icon={<Zap />}
 *   />
 */

import * as React from "react"
import { cn } from "@/lib/utils"

type TrendDirection = "up" | "down" | "neutral"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  unit?: string
  trend?: TrendDirection
  trendValue?: string
  trendLabel?: string
  description?: string
  icon?: React.ReactNode
}

const trendConfig: Record<TrendDirection, { color: string; arrow: string }> = {
  up:      { color: "text-[var(--ds-color-brand-secondary-strong)]", arrow: "↑" },
  down:    { color: "text-[var(--ds-color-status-error)]",           arrow: "↓" },
  neutral: { color: "text-[var(--ds-color-neutral-grey-60)]",        arrow: "—" },
}

function StatCard({ label, value, unit, trend, trendValue, trendLabel, description, icon, className, ...props }: StatCardProps) {
  const trendStyle = trend ? trendConfig[trend] : null

  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--ds-space-sm)] p-[var(--ds-space-lg)]",
        "rounded-[var(--ds-radius-lg)]",
        "border border-[var(--ds-color-neutral-grey-20)]",
        "bg-white [box-shadow:var(--ds-shadow-sm)]",
        className
      )}
      {...props}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-[var(--ds-space-sm)]">
        <span className="text-[var(--ds-font-size-xs)] font-[var(--ds-font-weight-semibold)] uppercase tracking-wide text-[var(--ds-color-neutral-grey-60)]">
          {label}
        </span>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-md)] bg-[var(--ds-color-brand-primary)] text-white">
            {icon}
          </div>
        )}
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-[var(--ds-space-xs)]">
        <span className="text-[var(--ds-font-size-3xl)] font-[var(--ds-font-weight-bold)] leading-none text-[var(--ds-color-neutral-ink)]">
          {value}
        </span>
        {unit && (
          <span className="text-[var(--ds-font-size-base)] text-[var(--ds-color-neutral-grey-60)]">
            {unit}
          </span>
        )}
      </div>

      {/* Trend row */}
      {trendStyle && trendValue && (
        <div className={cn("flex items-center gap-1 text-[var(--ds-font-size-xs)]", trendStyle.color)}>
          <span aria-hidden="true">{trendStyle.arrow}</span>
          <span className="font-[var(--ds-font-weight-semibold)]">{trendValue}</span>
          {trendLabel && (
            <span className="text-[var(--ds-color-neutral-grey-60)]">{trendLabel}</span>
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-[var(--ds-font-size-xs)] text-[var(--ds-color-neutral-grey-60)]">
          {description}
        </p>
      )}
    </div>
  )
}

export { StatCard, type StatCardProps, type TrendDirection }
