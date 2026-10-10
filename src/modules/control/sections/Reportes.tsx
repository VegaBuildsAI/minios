import { reports } from '@/config/solution-map'
import { Section } from './Section'

export function Reportes() {
  return (
    <Section id="reportes" label="Reportes" title="Lo que podés consultar y exportar">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-2.5">
        {reports.map((r) => (
          <div key={r.name} className="flex flex-col gap-1.5 rounded-[18px] border border-hair bg-white p-3.5">
            <b className="text-[0.9375rem] text-ink">{r.name}</b>
            <span className="text-[0.875rem] text-ink-2">{r.desc}</span>
            <span className="text-[0.75rem] font-bold text-brand">{r.formats.join(' · ')}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}
