interface KpiCardProps {
  label: string
  value: string
  hint?: string
  hintTone?: 'up' | 'down' | 'neutral'
  accentColor?: string
}

export function KpiCard({ label, value, hint, hintTone = 'neutral', accentColor }: KpiCardProps) {
  const toneColor =
    hintTone === 'up' ? 'var(--accent-green)' : hintTone === 'down' ? 'var(--accent-red)' : 'var(--text-muted)'
  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
      <div className="mb-1.5 text-[0.68rem] uppercase tracking-wide text-fg-muted">{label}</div>
      <div className="font-mono text-[1.35rem] font-bold" style={{ color: accentColor ?? 'var(--text-primary)' }}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 font-mono text-[0.68rem] font-semibold" style={{ color: toneColor }}>
          {hint}
        </div>
      )}
    </div>
  )
}
