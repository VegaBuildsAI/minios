import { meta } from '@/config/solution-map'
import { EnVivo } from './sections/EnVivo'
import { Accesos } from './sections/Accesos'
import { Modulos } from './sections/Modulos'
import { Flujos } from './sections/Flujos'
import { Reportes } from './sections/Reportes'
import { BaseDeDatos } from './sections/BaseDeDatos'
import { Stack } from './sections/Stack'

const NAV = [
  { id: 'en-vivo', label: 'En vivo' },
  { id: 'accesos', label: 'Accesos' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'flujos', label: 'Flujos' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'base-de-datos', label: 'Base de datos' },
  { id: 'stack', label: 'Stack' },
]

export function ControlPanel() {
  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-card p-6 sm:p-8">
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 15% 0%, var(--accent-orange-dim) 0%, transparent 45%), radial-gradient(ellipse at 90% 100%, var(--accent-blue-dim) 0%, transparent 45%)',
          }}
        />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-orange" style={{ borderColor: 'color-mix(in srgb, var(--accent-orange) 30%, transparent)', background: 'var(--accent-orange-dim)' }}>
            Panel de Control · {meta.version} · {meta.country}
          </div>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-fg sm:text-4xl">
            Mini<span className="text-orange">OS</span> — todo el paquete de la solución
          </h1>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-fg-secondary">{meta.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-6">
            {meta.stats.map((s) => (
              <div key={s.label}>
                <div className="font-mono text-2xl font-bold text-orange">{s.num}</div>
                <div className="text-[0.7rem] uppercase tracking-[0.1em] text-fg-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Sticky in-page nav */}
      <nav className="sticky top-0 z-20 -mx-4 mt-6 mb-8 border-b border-line bg-deep/85 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className="shrink-0 rounded-full px-3 py-1.5 text-[0.78rem] font-medium text-fg-muted transition-colors hover:bg-surface hover:text-fg"
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-14">
        <EnVivo />
        <Accesos />
        <Modulos />
        <Flujos />
        <Reportes />
        <BaseDeDatos />
        <Stack />
      </div>
    </div>
  )
}
