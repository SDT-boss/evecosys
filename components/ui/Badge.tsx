import { clsx } from 'clsx'

type BadgeVariant = 'green' | 'teal' | 'amber' | 'red' | 'gray' | 'blue'

const styles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  green: { bg: '#eaf5d8', color: '#3a7010', border: '#c0dfa0' },
  teal:  { bg: '#d2ecf0', color: '#0d4e5a', border: '#a0d0dc' },
  amber: { bg: '#fef3dc', color: '#8a5500', border: '#f0d080' },
  red:   { bg: '#fdeaea', color: '#8a1010', border: '#f5c0c0' },
  gray:  { bg: 'var(--surface2)', color: 'var(--text3)', border: 'var(--border)' },
  blue:  { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
}

export function Badge({
  variant = 'gray',
  dot = false,
  children,
  className,
}: {
  variant?: BadgeVariant
  dot?: boolean
  children: React.ReactNode
  className?: string
}) {
  const s = styles[variant]
  return (
    <span
      className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', className)}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: s.color }}
        />
      )}
      {children}
    </span>
  )
}
