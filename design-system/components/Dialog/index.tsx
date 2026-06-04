/**
 * Design System primitive: Dialog
 *
 * Modal overlay for focused tasks that interrupt the current flow:
 *   - Add / edit forms (new driver, assign vehicle, edit charging station)
 *   - Detail views that would require navigation (vehicle inspection modal)
 *   - Multi-step wizards (onboarding, forced password reset)
 *
 * Do NOT use Dialog for destructive confirmations — use AlertDialog instead.
 *
 * Overlay: black/80 scrim. Panel: white, ds-radius-lg, ds-shadow-lg.
 * Max width: 512px (max-w-lg). Close button: top-right, ghost X icon.
 * Focus ring on close: Jade (#008684).
 *
 * Animation: fade + zoom on open/close via tailwindcss-animate.
 *
 * Sub-components: Dialog, DialogTrigger, DialogContent, DialogHeader,
 *   DialogFooter, DialogTitle, DialogDescription, DialogClose
 */

"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[var(--ds-color-neutral-black)]/75",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg",
        "-translate-x-1/2 -translate-y-1/2",
        "gap-[var(--ds-space-md)] p-[var(--ds-space-lg)]",
        "rounded-[var(--ds-radius-lg)]",
        "border border-[var(--ds-color-neutral-grey-20)]",
        "bg-white text-[var(--ds-color-neutral-ink)]",
        "[box-shadow:var(--ds-shadow-lg)]",
        "duration-[var(--ds-motion-duration-base)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      {children}
      <DialogClose className={cn(
        "absolute right-[var(--ds-space-md)] top-[var(--ds-space-md)]",
        "rounded-[var(--ds-radius-sm)] opacity-70",
        "transition-opacity duration-[var(--ds-motion-duration-fast)]",
        "hover:opacity-100",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ds-color-brand-primary)] focus:ring-offset-2",
        "text-[var(--ds-color-neutral-grey-60)]"
      )}>
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogClose>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-[var(--ds-space-xs)] text-center sm:text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-[var(--ds-space-sm)] sm:flex-row sm:justify-end", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-[var(--ds-font-size-lg)] font-[var(--ds-font-weight-semibold)]",
      "leading-[var(--ds-font-line-height-tight)] tracking-tight",
      "text-[var(--ds-color-neutral-ink)]",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[var(--ds-font-size-sm)] text-[var(--ds-color-neutral-grey-60)]", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
