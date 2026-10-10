import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { modules } from '@/config/solution-map'
import { ICONS } from '@/modules/control/icons'

/** Módulo sin vista de escritorio todavía: se describe y se abre en la app móvil. */
export function ModulePlaceholder({ code }: { code: string }) {
  const mod = modules.find((m) => m.code === code)
  if (!mod) return null
  const Icon = ICONS[mod.icon]
  return (
    <div className="mx-auto max-w-[880px] rounded-[18px] border border-hair bg-white p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand">
          <Icon size={24} aria-hidden="true" />
        </span>
        <span className="tabular-nums text-[0.8125rem] font-bold text-ink-2">
          {mod.id} · {mod.priority}
        </span>
      </div>
      <h1 className="font-display-m text-[1.875rem] leading-tight font-bold text-ink">{mod.name}</h1>
      <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-2">{mod.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {mod.features.map((f) => (
          <span key={f} className="rounded-full bg-paper px-2.5 py-1 text-[0.8125rem] font-medium text-ink">
            {f}
          </span>
        ))}
      </div>
      <div className="mt-6 rounded-xl bg-paper p-4 text-[0.9375rem] text-ink-2">
        La vista de escritorio de este módulo todavía no existe. Se usa desde la app.
      </div>
      <Link to={mod.appPath} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-[0.9375rem] font-semibold text-white">
        Abrir {mod.name} en la app <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  )
}
