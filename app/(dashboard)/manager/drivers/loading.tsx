export default function DriversLoading() {
  return (
    <div className="fade-in">
      {/* Header skeleton */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="h-6 w-36 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 w-52 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="h-7 w-40 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* Fleet score summary bar */}
      <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex gap-6 flex-wrap">
          {[80, 64, 72].map((w, i) => (
            <div key={i}>
              <div className="h-2.5 w-16 rounded animate-pulse mb-2" style={{ background: 'var(--surface2)' }} />
              <div className="h-6 rounded animate-pulse" style={{ width: w, background: 'var(--surface2)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Driver card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--surface2)' }} />
              <div>
                <div className="h-3.5 w-28 rounded animate-pulse mb-1" style={{ background: 'var(--surface2)' }} />
                <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              </div>
            </div>
            {/* Score ring placeholder */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
            {/* Stat bars */}
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j}>
                  <div className="h-2 w-full rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
                </div>
              ))}
            </div>
            <div className="mt-4 h-8 w-full rounded-lg animate-pulse" style={{ background: 'var(--surface2)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
