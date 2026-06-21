import { Logo } from '@/components/ui/Logo'

interface BrandHeaderProps {
  collapsed?: boolean
}

export function BrandHeader({ collapsed = false }: BrandHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 'var(--ds-space-sm)' : 'var(--ds-space-md)',
        height: '64px',
        flexShrink: 0,
      }}
    >
      {collapsed ? (
        // When collapsed, show only the mark (first letter / icon mark)
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--ds-radius-sm)',
            background: 'var(--ds-color-brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'var(--ds-font-weight-bold)',
            fontSize: 'var(--ds-font-size-sm)',
            fontFamily: 'var(--ds-font-family-sans)',
          }}
        >
          E
        </div>
      ) : (
        <Logo width={110} />
      )}
    </div>
  )
}
