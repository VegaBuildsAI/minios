import type { ModuleStatus, Priority } from '@/config/solution-map'

const STATUS: Record<ModuleStatus, { label: string; accent: string }> = {
  planned: { label: 'Planeado', accent: 'var(--accent-blue)' },
  building: { label: 'En construcción', accent: 'var(--accent-amber)' },
  ready: { label: 'Listo', accent: 'var(--accent-green)' },
}

export function StatusBadge({ status }: { status: ModuleStatus }) {
  const s = STATUS[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold"
      style={{ color: s.accent, background: 'color-mix(in srgb, currentColor 12%, transparent)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {s.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="rounded-full bg-orange-dim px-2.5 py-0.5 font-mono text-[0.65rem] font-medium text-orange">
      {priority}
    </span>
  )
}
