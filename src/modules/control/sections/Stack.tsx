import { stack } from '@/config/solution-map'
import { Section } from './Section'

export function Stack() {
  return (
    <Section id="stack" label="Stack" title="Con qué está hecho">
      <div className="rounded-[18px] border border-hair bg-white">
        {stack.map((s) => (
          <div key={s.layer} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-paper-2 px-4 py-3 last:border-b-0">
            <span className="w-[110px] text-[0.75rem] font-bold tracking-[0.06em] text-ink-2 uppercase">{s.layer}</span>
            <b className="flex-[1_1_200px] text-[0.9375rem] text-ink">{s.tech}</b>
            <span className="flex-[2_1_260px] text-[0.875rem] text-ink-2">{s.note}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}
