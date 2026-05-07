export default function ManagerLoading() {
  return (
    <div className="fade-in">
      {/* PageHeader skeleton */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="h-6 w-36 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 w-56 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="h-7 w-32 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* KPI grid skeleton — 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--border)' }}
          >
            <div className="h-2.5 w-16 rounded animate-pulse mb-3" style={{ background: 'var(--surface2)' }} />
            <div className="h-7 w-20 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            <div className="h-2.5 w-24 rounded animate-pulse mt-2" style={{ background: 'var(--surface2)' }} />
          </div>
        ))}
      </div>

      {/* Two section cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="h-3 w-28 rounded animate-pulse mb-4" style={{ background: 'var(--surface2)' }} />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="h-4 rounded animate-pulse" style={{ background: 'var(--surface2)', width: `${60 + j * 10}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Vehicle table skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="px-4 py-3" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-8">
            {[80, 40, 40, 55, 100, 70].map((w, i) => (
              <div key={i} className="h-2.5 rounded animate-pulse" style={{ width: w, background: 'var(--border)' }} />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-8 items-center">
              <div>
                <div className="h-3 w-20 rounded animate-pulse mb-1" style={{ background: 'var(--surface2)' }} />
                <div className="h-2.5 w-16 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              </div>
              <div className="h-3 w-10 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-10 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
