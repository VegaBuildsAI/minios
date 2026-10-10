import { flows } from '@/config/solution-map'
import { Section } from './Section'

export function Flujos() {
  return (
    <Section id="flujos" label="Flujos" title="Cómo se mueve un dato">
      <div className="flex flex-col gap-3">
        {flows.map((f) => (
          <div key={f.id} className="flex flex-col gap-3 rounded-[18px] border border-hair bg-white p-[18px]">
            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
              <h3 className="text-[1.0625rem] font-bold text-ink">{f.name}</h3>
              <span className="text-[0.875rem] text-ink-2">Se dispara: {f.trigger}</span>
            </div>
            <ol className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
              {f.steps.map((s, i) => {
                const last = i === f.steps.length - 1
                return (
                  <li key={s.title} className="flex flex-col gap-0.5 rounded-xl bg-paper px-3 py-2.5">
                    <span
                      className={`tabular-nums mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] font-bold ${
                        last ? 'bg-brand text-white' : 'bg-white text-ink'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[0.875rem] font-bold text-ink">{s.title}</span>
                    <span className="text-[0.8125rem] leading-snug text-ink-2">{s.desc}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>
    </Section>
  )
}
