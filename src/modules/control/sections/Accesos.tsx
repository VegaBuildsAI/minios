import { modules, roles, type AccessLevel } from '@/config/solution-map'
import { Section } from './Section'

const CELL: Record<AccessLevel, { label: string; cls: string }> = {
  2: { label: 'Total', cls: 'text-brand' },
  1: { label: 'Ver', cls: 'text-warn' },
  0: { label: '—', cls: 'text-ink-3' },
}

/** Matriz rol × módulo. */
export function Accesos() {
  return (
    <Section
      id="accesos"
      label="Accesos"
      title="Quién ve qué"
      footer={<p className="text-[0.875rem] text-ink-2">Toda escritura pasa por RLS de Supabase o por RPC atómicas. La IA propone; un dueño o superadmin confirma.</p>}
    >
      <div className="overflow-x-auto rounded-[18px] border border-hair bg-white">
        <table className="w-full min-w-[640px] border-collapse text-[0.875rem]">
          <thead>
            <tr className="bg-paper text-center">
              <th scope="col" className="px-3.5 py-3 text-left font-bold text-ink">
                Rol
              </th>
              {modules.map((m) => (
                <th key={m.code} scope="col" className="px-1.5 py-3 text-[0.8125rem] font-semibold text-ink-2">
                  {m.name.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-t border-paper-2 text-center">
                <th scope="row" className="px-3.5 py-3 text-left font-normal">
                  <b className="block text-ink">{r.name}</b>
                  <span className="text-[0.8125rem] text-ink-2">{r.who}</span>
                </th>
                {modules.map((m) => {
                  const c = CELL[r.access[m.code] ?? 0]
                  return (
                    <td key={m.code} className={`px-1.5 py-3 font-bold ${c.cls}`}>
                      {c.label}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
