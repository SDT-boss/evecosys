export default function AssetsLoading() {
  return (
    <div className="fade-in">
      {/* PageHeader skeleton */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="h-6 w-44 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 w-64 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="h-7 w-36 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* Filter bar skeleton */}
      <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex gap-3 flex-wrap mb-3">
          <div className="h-9 flex-1 min-w-[200px] rounded-lg animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[52, 44, 40, 48, 44].map((w, i) => (
            <div key={i} className="h-7 rounded-full animate-pulse" style={{ width: w, background: 'var(--surface2)' }} />
          ))}
        </div>
      </div>

      {/* Asset card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="h-4 w-32 rounded animate-pulse mb-1.5" style={{ background: 'var(--surface2)' }} />
                <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              </div>
              <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
            <div className="space-y-2.5">
              <div className="h-2 w-full rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-2 w-5/6 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
