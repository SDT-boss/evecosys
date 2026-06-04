/**
 * Design System primitive: Avatar
 *
 * Circular user representation — photo, initials, or icon fallback.
 * Used throughout EVEcosys for driver profiles, manager accounts, and
 * assigned-user indicators in tables and cards.
 *
 * Sizing: set via className width/height (default 40×40px = h-10 w-10).
 * Common sizes: h-8 w-8 (table cell), h-10 w-10 (card header),
 *               h-14 w-14 (profile page), h-20 w-20 (driver detail).
 *
 * AvatarFallback: shows initials or an icon when the image fails or is
 * absent. Uses ds-color-neutral-grey-10 background with ds-color-neutral-grey-60
 * text — intentionally neutral so it does not compete with status colours.
 *
 * Sub-components: Avatar, AvatarImage, AvatarFallback
 */

"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden",
      "rounded-[var(--ds-radius-full)]",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center",
      "rounded-[var(--ds-radius-full)]",
      "bg-[var(--ds-color-neutral-grey-10)]",
      // Use explicit CSS property notation to avoid twMerge collapsing text-color and text-size
      "[color:var(--ds-color-neutral-grey-60)]",
      "text-[var(--ds-font-size-sm)] font-[var(--ds-font-weight-medium)]",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
