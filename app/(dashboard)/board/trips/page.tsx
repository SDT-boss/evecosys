export default function PlaceholderPage() {
  return (
    <div className="fade-in">
      <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="text-4xl mb-3">🚧</div>
        <p className="font-semibold mb-1" style={{ color: 'var(--text)', fontWeight: 600 }}>Coming soon</p>
        <p className="text-sm" style={{ color: 'var(--text3)' }}>This section is being built in the current sprint.</p>
      </div>
    </div>
  )
}
