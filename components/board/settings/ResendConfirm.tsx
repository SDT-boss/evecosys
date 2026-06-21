'use client'

/**
 * ResendConfirm — confirmation dialog for re-sending an invite
 *
 * Uses AlertDialog from @evecosys/design-system. On confirmation, calls
 * onConfirm. On success (success=true), renders a toast-like notification
 * inside the component with an Undo link.
 *
 * Toast is an absolute-positioned div within ResendConfirm — NOT a global
 * toast system.
 */

import React from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@evecosys/design-system'

export interface ResendConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  success?: boolean
  onUndo?: () => void
  email?: string
}

export function ResendConfirm({
  open,
  onClose,
  onConfirm,
  success = false,
  onUndo,
  email,
}: ResendConfirmProps) {
  return (
    <div style={{ position: 'relative' }}>
      <AlertDialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend invite?</AlertDialogTitle>
            <AlertDialogDescription>
              {email
                ? `A new invite email will be sent to ${email}. The previous link will be invalidated.`
                : 'A new invite email will be sent. The previous link will be invalidated.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Resend invite</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {success && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + var(--ds-space-sm))',
            right: 0,
            background: '#1a1a1a',
            color: '#ffffff',
            padding: 'var(--ds-space-sm) var(--ds-space-md)',
            borderRadius: 'var(--ds-radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--ds-space-sm)',
            fontSize: 'var(--ds-font-size-sm)',
            fontFamily: 'var(--ds-font-family-sans)',
            boxShadow: 'var(--ds-shadow-md)',
            whiteSpace: 'nowrap',
            zIndex: 50,
          }}
        >
          {/* Checkmark */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7cc242"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Invite resent
          {onUndo && (
            <button
              onClick={onUndo}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ds-color-brand-primary)',
                cursor: 'pointer',
                fontSize: 'var(--ds-font-size-sm)',
                fontFamily: 'var(--ds-font-family-sans)',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
