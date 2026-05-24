export default function ChargingLoading() {
  return (
    <div className="fade-in">
      {/* PageHeader skeleton */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="h-6 w-44 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 w-72 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
      </div>

      {/* Top bar action skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-5 w-40 rounded animate-pulse mb-1" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="h-9 w-28 rounded-xl animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* Station card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl animate-pulse flex-shrink-0" style={{ background: 'var(--surface2)' }} />
                <div>
                  <div className="h-3.5 w-28 rounded animate-pulse mb-1" style={{ background: 'var(--surface2)' }} />
                  <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
                </div>
              </div>
              <div className="h-5 w-14 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="h-3 w-full rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            <div className="h-8 w-full rounded-lg animate-pulse" style={{ background: 'var(--surface2)' }} />
          </div>
        ))}
      </div>

      {/* Map area skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="h-80 animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>
    </div>
  )
}
