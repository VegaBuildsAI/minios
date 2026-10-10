import { modules, roles } from '@/config/solution-map'
import { accentVars } from '@/lib/accent'
import { SectionHeader } from '@/components/SectionHeader'

const moduleName = (code: string) => modules.find((m) => m.code === code)?.name ?? code

export function Accesos() {
  return (
    <section id="accesos" className="scroll-mt-20">
      <SectionHeader
        label="Accesos"
        title="Quién ve qué"
        desc="Autenticación por magic link (Supabase Auth). El rol de cada usuario, guardado en profiles, gobierna la app y la base de datos vía Row Level Security (RLS)."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const mods = role.modules === '*' ? modules.map((m) => m.name) : role.modules.map(moduleName)
          return (
            <div
              key={role.id}
              style={accentVars(role.accent)}
              className="rounded-[var(--radius-lg)] border border-line bg-card p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold"
                  style={{ color: 'var(--a)', background: 'var(--a-dim)' }}
                >
                  {role.id}
                </span>
                <h3 className="text-[1rem] font-bold text-fg">{role.name}</h3>
              </div>
              <p className="mb-1 text-[0.8rem] font-medium text-fg-secondary">{role.who}</p>
              <p className="mb-3 text-[0.78rem] leading-relaxed text-fg-muted">{role.notes}</p>
              <div className="flex flex-wrap gap-1.5">
                {mods.map((m) => (
                  <span
                    key={m}
                    className="rounded-full border border-line bg-surface px-2 py-0.5 text-[0.68rem] text-fg-secondary"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
