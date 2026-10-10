import { stack } from '@/config/solution-map'
import { accentVars } from '@/lib/accent'
import { SectionHeader } from '@/components/SectionHeader'

export function Stack() {
  return (
    <section id="stack" className="scroll-mt-20">
      <SectionHeader
        label="Stack / Infra"
        title="100% Supabase, sin otro deployer"
        desc="Cada capa elegida para costo cero en la fase inicial y una sola cuenta: desarrollo local con Supabase CLI, producción en Supabase Cloud + Hosting."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stack.map((s) => (
          <div
            key={s.layer}
            style={accentVars(s.accent)}
            className="rounded-[var(--radius)] border border-line bg-card p-4 transition-colors hover:border-line-accent"
          >
            <div className="mb-1 font-mono text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: 'var(--a)' }}>
              {s.layer}
            </div>
            <div className="mb-1 text-[0.95rem] font-bold text-fg">{s.tech}</div>
            <div className="text-[0.76rem] leading-snug text-fg-muted">{s.note}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
