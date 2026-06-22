/**
 * Design System molecule: NavigationItem (custom — EVEcosys)
 *
 * Sidebar navigation link used in Manager, Admin, and Driver dashboards.
 * Renders as an accessible <a> (or wraps a Next.js Link via asChild) with
 * icon, label, and optional badge for counts (unread alerts, pending tasks).
 *
 * States:
 *   default  — transparent bg, grey-60 text and icon
 *   hover    — grey-10 bg, ink text
 *   active   — Jade-tinted bg (Jade at 10% opacity), Jade Strong text and icon
 *   disabled — grey-40 text, no hover effect, cursor-default
 *
 * The active state uses a 3px left border in Jade Strong as the primary
 * selection indicator — colour alone is never the sole signal (WCAG 1.4.1).
 *
 * Props:
 *   href      — destination URL (pass to Next.js Link via asChild)
 *   label     — navigation label text
 *   icon      — lucide-react or custom SVG icon (20×20)
 *   isActive  — marks the current route
 *   badge     — optional count to display (alerts, unread, etc.)
 *   asChild   — render as Slot for Next.js Link composition
 *
 * Usage with Next.js:
 *   <NavigationItem asChild label="Alerts" icon={<Bell />} isActive badge={3}>
 *     <Link href="/dashboard/manager/alerts" />
 *   </NavigationItem>
 */

"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

interface NavigationItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  label: string
  icon?: React.ReactNode
  isActive?: boolean
  badge?: number
  asChild?: boolean
  disabled?: boolean
}

const NavigationItem = React.forwardRef<HTMLAnchorElement, NavigationItemProps>(
  ({ label, icon, isActive, badge, asChild, disabled, className, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "a"

    return (
      <Comp
        ref={ref}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          // Base layout
          "group flex items-center gap-[var(--ds-space-sm)] px-[var(--ds-space-sm)] py-[var(--ds-space-xs)]",
          "rounded-[var(--ds-radius-md)] w-full",
          "text-[var(--ds-font-size-sm)] font-[var(--ds-font-weight-medium)]",
          "transition-colors duration-(--ds-motion-duration-fast)",
          "border-l-2 border-transparent",
          // Default
          "text-[var(--ds-color-neutral-grey-60)]",
          // Hover (not active, not disabled)
          !isActive && !disabled && "hover:bg-[var(--ds-color-neutral-grey-10)] hover:text-[var(--ds-color-neutral-ink)]",
          // Active
          isActive && [
            "border-l-[var(--ds-color-brand-primary-strong)]",
            "bg-[rgba(0,134,132,0.08)]",
            "text-[var(--ds-color-brand-primary-strong)]",
          ],
          // Disabled
          disabled && "cursor-default text-[var(--ds-color-neutral-grey-40)] pointer-events-none",
          className
        )}
        {...props}
      >
        {icon && (
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center",
              isActive ? "text-[var(--ds-color-brand-primary-strong)]" : "text-[var(--ds-color-neutral-grey-40)]",
              !isActive && !disabled && "group-hover:text-[var(--ds-color-neutral-ink)]"
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <span className="flex-1 truncate">{label}</span>

        {badge != null && badge > 0 && (
          <span
            className={cn(
              "flex h-5 min-w-[20px] items-center justify-center px-1.5",
              "rounded-[var(--ds-radius-full)]",
              "text-[10px] font-[var(--ds-font-weight-semibold)]",
              isActive
                ? "bg-[var(--ds-color-brand-primary-strong)] text-white"
                : "bg-[var(--ds-color-neutral-grey-20)] text-[var(--ds-color-neutral-ink)]"
            )}
            aria-label={`${badge} unread`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}

        {asChild && children}
      </Comp>
    )
  }
)
NavigationItem.displayName = "NavigationItem"

export { NavigationItem, type NavigationItemProps }
