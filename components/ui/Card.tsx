export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2, flexShrink: 0 }} />
      <span
        className="text-[11px] font-bold uppercase tracking-wide"
        style={{ color: 'var(--ev-teal)', letterSpacing: '0.6px' }}
      >
        {children}
      </span>
    </div>
  )
}

export function Card({
  children,
  className,
  noPad,
}: {
  children: React.ReactNode
  className?: string
  noPad?: boolean
}) {
  return (
    <div
      className={`rounded-xl theme-transition ${noPad ? '' : 'p-5'} ${className ?? ''}`}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
