export function SocBar({ value, label }: { value: number; label: string }) {
  const color = value >= 50 ? '#5a9e2f' : value >= 20 ? '#c07800' : '#c02020'
  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-xs">
        <span style={{ color: 'var(--text2)' }}>{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function GaugeBox({ label, value, unit, color }: {
  label: string; value: number; unit: string; color: string
}) {
  return (
    <div className="rounded-xl p-4 text-center flex-1" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.4px' }}>
        {label}
      </div>
      <div className="text-4xl font-bold font-condensed leading-none" style={{ color, letterSpacing: '-1px' }}>
        {value}
      </div>
      <div className="text-xs mt-1.5" style={{ color: 'var(--text3)' }}>{unit}</div>
      <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--border)' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 9999, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}
