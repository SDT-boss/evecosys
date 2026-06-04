/**
 * Design System molecule: FormField (custom — EVEcosys)
 *
 * Composes Label + control slot + HelperText + ErrorMessage into a single,
 * consistently spaced unit. Eliminates manual spacing and error-state wiring
 * across all forms in the app.
 *
 * Layout (top to bottom):
 *   Label          — ds-font-size-sm / medium / ink
 *   [control]      — Input, Select, Textarea, Checkbox row, RadioGroup, etc.
 *   HelperText     — ds-font-size-xs / grey-60 (hidden when error is active)
 *   ErrorMessage   — ds-font-size-xs / status-error (replaces helper)
 *
 * Props:
 *   label        — field label text (passed to <Label>)
 *   htmlFor      — id of the control (wires Label → control)
 *   helper       — optional helper string shown below the control
 *   error        — error string; when set, hides helper and shows red message
 *   required     — appends a red asterisk to the label
 *   children     — the actual form control (Input, Select, Textarea, etc.)
 *
 * The FormField sets aria-describedby on children automatically when helper
 * or error text is present, using generated ids.
 *
 * Usage:
 *   <FormField label="Driver email" htmlFor="driver-email" error={errors.email}>
 *     <Input id="driver-email" aria-invalid={!!errors.email} />
 *   </FormField>
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/design-system/components/Label"

interface FormFieldProps {
  label: string
  htmlFor: string
  helper?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

function FormField({ label, htmlFor, helper, error, required, className, children }: FormFieldProps) {
  const helperId = `${htmlFor}-helper`
  const errorId = `${htmlFor}-error`

  return (
    <div className={cn("flex flex-col gap-[var(--ds-space-xs)]", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-0.5 text-[var(--ds-color-status-error)]" aria-hidden="true">
            {" "}*
          </span>
        )}
      </Label>

      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          "aria-describedby": error ? errorId : helper ? helperId : undefined,
        })
      })}

      {error ? (
        <p id={errorId} role="alert" className="text-[var(--ds-font-size-xs)] text-[var(--ds-color-status-error)] flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 2.5a.5.5 0 01.5.5v2a.5.5 0 01-1 0V4a.5.5 0 01.5-.5zm0 5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-[var(--ds-font-size-xs)] text-[var(--ds-color-neutral-grey-60)]">
          {helper}
        </p>
      ) : null}
    </div>
  )
}

export { FormField, type FormFieldProps }
