export default function DriverLoading() {
  return (
    <div className="fade-in">
      {/* PageHeader skeleton */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="h-6 w-28 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 w-48 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="h-7 w-36 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* Battery + Vehicle details row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Battery card */}
        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="h-3 w-28 rounded animate-pulse mb-4" style={{ background: 'var(--surface2)' }} />
          <div className="flex gap-3 mb-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl p-4 flex-1" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="h-2.5 w-20 rounded animate-pulse mb-3 mx-auto" style={{ background: 'var(--border)' }} />
                <div className="h-10 w-16 rounded animate-pulse mx-auto mb-2" style={{ background: 'var(--border)' }} />
                <div className="h-2 w-full rounded-full animate-pulse" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle details card */}
        <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="h-3 w-28 rounded animate-pulse mb-4" style={{ background: 'var(--surface2)' }} />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
                <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today + Behavior + Chargers row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="h-3 w-20 rounded animate-pulse mb-4" style={{ background: 'var(--surface2)' }} />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="flex justify-between items-center">
                  <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
                  <div className="h-5 w-20 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent trips table skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
        </div>
        <div className="px-4 py-2.5" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-6">
            {[40, 140, 55, 50, 50].map((w, i) => (
              <div key={i} className="h-2.5 rounded animate-pulse" style={{ width: w, background: 'var(--border)' }} />
            ))}
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-6 items-center">
              <div className="h-3 w-10 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-36 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-14 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-10 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-14 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
