export default function AlertsLoading() {
  return (
    <div className="fade-in">
      {/* PageHeader skeleton */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="h-6 w-52 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 w-44 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="h-7 w-28 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* Filter tab pills */}
      <div className="flex items-center gap-3 mb-5">
        {[64, 72, 80].map((w, i) => (
          <div key={i} className="h-7 rounded-full animate-pulse" style={{ width: w, background: 'var(--surface2)' }} />
        ))}
      </div>

      {/* Alert list */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{ borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}
          >
            <div className="w-9 h-9 rounded-xl animate-pulse flex-shrink-0" style={{ background: 'var(--surface2)' }} />
            <div className="flex-1">
              <div className="h-3.5 w-3/4 rounded animate-pulse mb-2" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
            <div className="h-7 w-20 rounded-lg animate-pulse flex-shrink-0" style={{ background: 'var(--surface2)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
