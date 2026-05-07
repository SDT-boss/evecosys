export default function DriverAlertsLoading() {
  return (
    <div className="fade-in">
      <div className="mb-6">
        <div className="h-6 w-24 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
        <div className="h-3 w-32 rounded mt-1.5 animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>

      {/* Tab skeleton */}
      <div className="flex gap-2 mb-5">
        {[60, 70, 80].map((w, i) => (
          <div key={i} className="h-7 rounded-full animate-pulse" style={{ width: w, background: 'var(--surface2)' }} />
        ))}
      </div>

      {/* Alert card skeletons */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4" style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
            <div className="w-9 h-9 rounded-xl animate-pulse flex-shrink-0" style={{ background: 'var(--surface2)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded animate-pulse" style={{ width: '60%', background: 'var(--surface2)' }} />
              <div className="h-3 rounded animate-pulse" style={{ width: '35%', background: 'var(--surface2)' }} />
            </div>
            <div className="h-7 w-28 rounded-lg animate-pulse flex-shrink-0" style={{ background: 'var(--surface2)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
