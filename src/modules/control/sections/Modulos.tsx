import { Link } from 'react-router-dom'
import { modules } from '@/config/solution-map'
import { ICONS } from '../icons'
import { Section } from './Section'

export function Modulos() {
  return (
    <Section id="modulos" label="Módulos" title="Siete módulos, una sola operación">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3">
        {modules.map((m) => {
          const Icon = ICONS[m.icon]
          return (
            <article key={m.id} className="flex flex-col gap-2.5 rounded-[18px] border border-hair bg-white p-[18px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="tabular-nums text-[0.8125rem] font-bold text-ink-2">
                    {m.id} · {m.priority}
                  </span>
                </span>
                <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[0.75rem] font-bold text-brand">
                  {m.status === 'ready' ? 'Listo' : m.status === 'building' ? 'En construcción' : 'Planeado'}
                </span>
              </div>
              <h3 className="text-[1.125rem] font-bold text-ink">{m.name}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-ink-2">{m.description}</p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {m.features.map((f) => (
                  <span key={f} className="rounded-full bg-paper px-2.5 py-1 text-[0.8125rem] font-medium text-ink">
                    {f}
                  </span>
                ))}
              </div>
              <Link to={m.appPath} className="text-[0.875rem] font-semibold text-brand hover:underline">
                Abrir en la app
              </Link>
            </article>
          )
        })}
      </div>
    </Section>
  )
}
