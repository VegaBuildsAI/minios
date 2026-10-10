import type { ModuleDef } from '@/config/solution-map'
import { accentVars } from '@/lib/accent'
import { PriorityBadge, StatusBadge } from './StatusBadge'

export function ModuleCard({ module }: { module: ModuleDef }) {
  return (
    <div
      style={accentVars(module.accent)}
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-line-accent hover:bg-card-hover"
    >
      <span className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'var(--a)' }} />
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-xl"
          style={{ background: 'var(--a-dim)' }}
        >
          {module.icon}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.65rem] text-fg-muted">{module.id}</span>
          <PriorityBadge priority={module.priority} />
        </div>
      </div>
      <h3 className="mb-1.5 text-[1.1rem] font-bold text-fg">{module.name}</h3>
      <p className="mb-4 text-[0.85rem] leading-relaxed text-fg-secondary">{module.description}</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {module.features.map((f) => (
          <span
            key={f}
            className="rounded-full border border-line bg-surface px-2.5 py-1 text-[0.7rem] font-medium text-fg-muted"
          >
            {f}
          </span>
        ))}
      </div>
      <StatusBadge status={module.status} />
    </div>
  )
}
