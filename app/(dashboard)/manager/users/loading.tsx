export default function UsersLoading() {
  return (
    <div className="fade-in">
      {/* Action button skeleton */}
      <div className="flex justify-end mb-5">
        <div className="h-9 w-24 rounded-lg animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* Users table skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 py-3" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-8">
            {[80, 140, 80, 60].map((w, i) => (
              <div key={i} className="h-2.5 rounded animate-pulse" style={{ width: w, background: 'var(--border)' }} />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-8 items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--surface2)' }} />
                <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              </div>
              <div className="h-3 w-36 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-5 w-20 rounded-full animate-pulse" style={{ background: 'var(--surface2)' }} />
              <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
