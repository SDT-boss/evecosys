'use client'

import { Building2 } from 'lucide-react'
import { useTenantContext } from '@/components/platform/TenantContext'

export function ActiveTenantIndicator() {
  const { activeTenantName } = useTenantContext()
  const isActive = Boolean(activeTenantName)
  return (
    <div className="flex items-center gap-[var(--ds-space-xs)]">
      <Building2
        size={14}
        style={{
          color: isActive ? 'var(--ds-color-brand-primary)' : 'var(--ds-color-neutral-grey-40)',
          transition: 'color var(--ds-motion-duration-base) var(--ds-motion-easing-standard)',
        }}
      />
      <span
        className="text-xs font-semibold"
        style={{
          color: isActive ? 'var(--ds-color-brand-primary)' : 'var(--ds-color-neutral-grey-40)',
          transition: 'color var(--ds-motion-duration-base) var(--ds-motion-easing-standard)',
        }}
      >
        {activeTenantName ?? 'No workspace selected'}
      </span>
    </div>
  )
}
