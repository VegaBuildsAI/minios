import { meta } from '@/config/solution-map'
import { Accesos } from './sections/Accesos'
import { BaseDeDatos } from './sections/BaseDeDatos'
import { Flujos } from './sections/Flujos'
import { Modulos } from './sections/Modulos'
import { Reportes } from './sections/Reportes'
import { Stack } from './sections/Stack'

const TOC = [
  { id: 'modulos', label: 'Módulos' },
  { id: 'flujos', label: 'Flujos' },
  { id: 'accesos', label: 'Accesos' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'base-de-datos', label: 'Base de datos' },
  { id: 'stack', label: 'Stack' },
]

/** «Conoce la app»: el mapa de la solución (antes era la portada del Panel de Control). */
export function ConoceApp() {
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-10">
      <header className="flex flex-col gap-[18px] rounded-3xl bg-ink p-[clamp(24px,4vw,44px)] text-paper">
        <span className="self-start rounded-full bg-marigold px-3 py-1 text-[0.75rem] font-bold tracking-[0.06em] text-ink uppercase">
          Conoce la app · {meta.version} · {meta.country}
        </span>
        <h1 className="font-display-m max-w-[820px] text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] font-bold text-white">
          MiniOS: todo el minisúper en el celular
        </h1>
        <p className="max-w-[720px] text-[1.125rem] leading-relaxed text-[#cfd4cf]">{meta.tagline}</p>
        <div className="mt-1.5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
          {meta.stats.map((s) => (
            <div key={s.label} className="border-t-2 border-[#3a413c] pt-3">
              <div className="font-display-m tabular-nums text-[2.125rem] font-bold text-marigold">{s.num}</div>
              <div className="text-[0.875rem] text-[#cfd4cf]">{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      <nav aria-label="Secciones" className="sticky top-0 z-10 -my-4 flex flex-wrap gap-1.5 bg-paper py-2 md:top-0">
        {TOC.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="flex h-9 items-center rounded-full border border-hair-strong bg-white px-3.5 text-[0.875rem] font-semibold text-ink hover:border-brand"
          >
            {t.label}
          </a>
        ))}
      </nav>

      <Modulos />
      <Flujos />
      <Accesos />
      <Reportes />
      <BaseDeDatos />
      <Stack />
    </div>
  )
}
