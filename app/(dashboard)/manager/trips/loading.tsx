export default function TripsLoading() {
  return (
    <div className="fade-in">
      {/* Header skeleton */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="h-6 w-36 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 w-48 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="flex gap-3">
          {[100, 100].map((w, i) => (
            <div key={i} className="rounded-xl px-4 py-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: w }}>
              <div className="h-2.5 w-full rounded animate-pulse mb-1" style={{ background: 'var(--surface2)' }} />
              <div className="h-5 w-3/4 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 py-3" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-6">
            {[50, 70, 80, 120, 55, 50, 50, 60].map((w, i) => (
              <div key={i} className="h-2.5 rounded animate-pulse" style={{ width: w, background: 'var(--border)' }} />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-6 items-center">
              <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div>
                <div className="h-3 w-16 rounded animate-pulse mb-1" style={{ background: 'var(--surface2)' }} />
                <div className="h-2.5 w-20 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              </div>
              <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-10 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-14 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-14 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
