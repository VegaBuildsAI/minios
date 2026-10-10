import { Link } from 'react-router-dom'
import { modules } from '@/config/solution-map'
import { accentVars } from '@/lib/accent'
import { PriorityBadge, StatusBadge } from './StatusBadge'

/** Placeholder for modules not yet built (Fase 0). Reads its data from the manifest. */
export function ModulePlaceholder({ code }: { code: string }) {
  const mod = modules.find((m) => m.code === code)
  if (!mod) return null
  return (
    <div className="animate-fade-up">
      <div
        style={accentVars(mod.accent)}
        className="rounded-[var(--radius-lg)] border border-line bg-card p-6 sm:p-8"
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] text-2xl"
            style={{ background: 'var(--a-dim)' }}
          >
            {mod.icon}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.7rem] text-fg-muted">{mod.id}</span>
            <PriorityBadge priority={mod.priority} />
            <StatusBadge status={mod.status} />
          </div>
        </div>
        <h1 className="font-display text-2xl font-extrabold text-fg sm:text-3xl">{mod.name}</h1>
        <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-fg-secondary">{mod.description}</p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {mod.features.map((f) => (
            <span key={f} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[0.72rem] text-fg-muted">
              {f}
            </span>
          ))}
        </div>
        <div className="mt-6 rounded-[var(--radius)] border border-dashed border-line-accent bg-surface/50 p-4 text-[0.82rem] text-fg-secondary">
          Este módulo se construye en una fase posterior. Por ahora, revisá el mapa completo en el{' '}
          <Link to="/control" className="font-semibold text-orange hover:underline">
            Panel de Control
          </Link>
          .
        </div>
      </div>
    </div>
  )
}
