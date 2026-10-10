import { dbTables, type DbTableDef } from '@/config/solution-map'
import { SectionHeader } from '@/components/SectionHeader'

const GROUP_ORDER: DbTableDef['group'][] = [
  'Usuarios',
  'Catálogo',
  'Ventas',
  'Inventario',
  'Compras',
  'Caja',
  'Bitácora',
]

export function BaseDeDatos() {
  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    tables: dbTables.filter((t) => t.group === g),
  })).filter((x) => x.tables.length > 0)

  return (
    <section id="base-de-datos" className="scroll-mt-20">
      <SectionHeader
        label="Base de datos"
        title="El esquema en Supabase Postgres"
        desc="12 tablas con Row Level Security por rol. profiles extiende auth.users; cada venta deduce stock vía stock_movements."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map(({ group, tables }) => (
          <div key={group} className="rounded-[var(--radius-lg)] border border-line bg-card p-4">
            <div className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-fg-muted">{group}</div>
            <div className="flex flex-col gap-2.5">
              {tables.map((t) => (
                <div key={t.name} className="rounded-[var(--radius-sm)] border border-line bg-surface p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[0.8rem] font-semibold text-orange">{t.name}</span>
                    <span className="text-[0.72rem] text-fg-muted">{t.desc}</span>
                  </div>
                  <div className="mt-1 font-mono text-[0.68rem] leading-relaxed text-fg-muted">{t.columns}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
