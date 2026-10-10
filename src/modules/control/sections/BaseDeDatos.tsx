import { dbTables, type DbTableDef } from '@/config/solution-map'
import { Section } from './Section'

const GROUP_ORDER: DbTableDef['group'][] = ['Usuarios', 'Catálogo', 'Ventas', 'Inventario', 'Compras', 'Caja', 'Bitácora e IA', 'Configuración']

export function BaseDeDatos() {
  const grouped = GROUP_ORDER.map((g) => ({ group: g, tables: dbTables.filter((t) => t.group === g) })).filter((x) => x.tables.length > 0)

  return (
    <Section id="base-de-datos" label="Base de datos" title={`${dbTables.length} tablas en Supabase Postgres`}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-2.5">
        {grouped.map(({ group, tables }) => (
          <div key={group} className="flex flex-col gap-2 rounded-[18px] border border-hair bg-white p-3.5">
            <div className="text-[0.75rem] font-bold tracking-[0.06em] text-ink-2 uppercase">{group}</div>
            {tables.map((t) => (
              <div key={t.name}>
                <code className="font-mono-m text-[0.875rem] font-bold text-ink">{t.name}</code>
                <div className="text-[0.8125rem] text-ink-2">{t.desc}</div>
                <div className="font-mono-m mt-0.5 text-[0.75rem] leading-snug text-ink-3">{t.columns}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  )
}
