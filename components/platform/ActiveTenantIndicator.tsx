import { Building2 } from 'lucide-react'

interface ActiveTenantIndicatorProps {
  name: string | null
}

export function ActiveTenantIndicator({ name }: ActiveTenantIndicatorProps) {
  const isActive = Boolean(name)
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
        {name ?? 'No workspace selected'}
      </span>
    </div>
  )
}
