export default function BoardLoading() {
  return (
    <div className="fade-in">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="h-6 w-48 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 w-64 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="h-7 w-40 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-1 mb-6 border-b pb-px" style={{ borderColor: 'var(--border)' }}>
        {[72, 52, 68, 52].map((w, i) => (
          <div key={i} className="h-8 rounded animate-pulse" style={{ width: w, background: 'var(--surface2)' }} />
        ))}
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--border)' }}>
            <div className="h-2.5 w-20 rounded animate-pulse mb-3" style={{ background: 'var(--surface2)' }} />
            <div className="h-8 w-24 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            <div className="h-2.5 w-32 rounded animate-pulse mt-2" style={{ background: 'var(--surface2)' }} />
          </div>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="h-3 w-32 rounded animate-pulse mb-5" style={{ background: 'var(--surface2)' }} />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="h-4 rounded animate-pulse" style={{ background: 'var(--surface2)', width: `${70 + Math.random() * 20}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
