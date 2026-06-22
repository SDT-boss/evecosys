/**
 * Design System primitive: Tabs
 *
 * Segment switching between related views within the same page context.
 * Used throughout EVEcosys for:
 *   - Manager dashboard: Fleet / Drivers / Alerts / Charging tabs
 *   - Vehicle detail: Overview / Trips / Alerts / Charging History
 *   - User management: Active / Inactive / Pending
 *   - Reports: Daily / Weekly / Monthly
 *
 * TabsList: grey-05 pill container. Active tab: white bg, ds-shadow-sm lift,
 *   ink text. Inactive tab: transparent bg, grey-60 text.
 * Focus ring on triggers: Jade (#008684).
 *
 * Sub-components: Tabs, TabsList, TabsTrigger, TabsContent
 *
 * For page-level navigation (switching between full pages), use
 * NavigationItem in the sidebar instead — Tabs is for in-page segmentation.
 */

"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center",
      "rounded-[var(--ds-radius-md)]",
      "bg-[var(--ds-color-neutral-grey-05)]",
      "p-1 gap-1",
      "text-[var(--ds-color-neutral-grey-60)]",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap",
      "rounded-[var(--ds-radius-sm)] px-3 py-1.5",
      "text-[var(--ds-font-size-sm)] font-[var(--ds-font-weight-medium)]",
      "ring-offset-white",
      "transition-all duration-(--ds-motion-duration-fast)",
      "focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-[var(--ds-color-brand-primary)] focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:text-[var(--ds-color-neutral-grey-40)]",
      "data-[state=active]:bg-white data-[state=active]:text-[var(--ds-color-neutral-ink)]",
      "data-[state=active]:[box-shadow:var(--ds-shadow-sm)]",
      "data-[state=inactive]:text-[var(--ds-color-neutral-grey-60)]",
      "data-[state=inactive]:hover:text-[var(--ds-color-neutral-ink)]",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-[var(--ds-space-sm)] ring-offset-white",
      "focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-[var(--ds-color-brand-primary)] focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
