import { reports } from '@/config/solution-map'
import { SectionHeader } from '@/components/SectionHeader'

export function Reportes() {
  return (
    <section id="reportes" className="scroll-mt-20">
      <SectionHeader
        label="Reportes"
        title="El negocio, en números"
        desc="Cuadre de caja, márgenes, cuentas por cobrar y ventas por período — exportables a CSV y PDF."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <div key={r.name} className="rounded-[var(--radius)] border border-line bg-card p-4">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <h3 className="text-[0.9rem] font-bold text-fg">{r.name}</h3>
              <div className="flex shrink-0 gap-1">
                {r.formats.map((f) => (
                  <span key={f} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.6rem] text-fg-muted">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[0.78rem] leading-relaxed text-fg-secondary">{r.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
