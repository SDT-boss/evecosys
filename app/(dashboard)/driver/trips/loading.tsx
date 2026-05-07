export default function DriverTripsLoading() {
  return (
    <div className="fade-in">
      <div className="mb-6">
        <div className="h-6 w-24 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
        <div className="h-3 w-32 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* Filter bar skeleton */}
      <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex gap-3 flex-wrap">
          <div className="h-9 flex-1 min-w-[180px] rounded-lg animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-9 w-24 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-9 w-24 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-9 w-32 rounded-lg animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 py-3" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-4">
            {[120, 60, 60, 60, 70, 80].map((w, i) => (
              <div key={i} className="h-3 rounded animate-pulse" style={{ width: w, background: 'var(--border)' }} />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-4 items-center">
              <div className="h-3.5 rounded animate-pulse" style={{ width: 160, background: 'var(--surface2)' }} />
              <div className="h-3.5 rounded animate-pulse" style={{ width: 55, background: 'var(--surface2)' }} />
              <div className="h-3.5 rounded animate-pulse" style={{ width: 55, background: 'var(--surface2)' }} />
              <div className="h-3.5 rounded animate-pulse" style={{ width: 55, background: 'var(--surface2)' }} />
              <div className="h-3.5 rounded animate-pulse" style={{ width: 65, background: 'var(--surface2)' }} />
              <div className="h-3.5 rounded animate-pulse" style={{ width: 75, background: 'var(--surface2)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
