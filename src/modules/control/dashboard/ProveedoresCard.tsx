import { useProducts, usePurchaseOrders, useSuppliers } from '@/lib/data'
import { formatCRC } from '@/lib/types'
import { DAYS, DAY_SHORT, visitsOn } from '@/lib/visits'
import { ModuleCard } from './ui'
import { crParts, crStartOfDay } from '@/lib/time'

export function ProveedoresCard() {
  const { data: suppliers = [] } = useSuppliers()
  const { data: products = [] } = useProducts()
  const { data: orders = [] } = usePurchaseOrders()

  const week = Array.from({ length: 7 }, (_, i) => {
    const p = crParts(crStartOfDay(new Date(), i))
    const day = DAYS[p.dow]
    return { key: i, short: DAY_SHORT[p.dow], n: p.day, visits: suppliers.filter((s) => visitsOn(s, day)), today: i === 0 }
  })
  const today = week[0].visits
  const lowOf = (id: string) => products.filter((p) => p.supplier_id === id && p.stock_qty <= p.min_qty).length
  const open = orders.filter((o) => o.status === 'borrador' || o.status === 'enviada').slice(0, 4)
  const supName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? 'Sin proveedor'

  return (
    <ModuleCard label="Proveedores" title="Próximos 7 días" to="/app/proveedores">
      <ol className="grid grid-cols-7 gap-1" aria-label="Visitas de los próximos 7 días">
        {week.map((w) => (
          <li
            key={w.key}
            aria-label={`${w.today ? 'Hoy' : w.short} ${w.n}: ${w.visits.length} ${w.visits.length === 1 ? 'visita' : 'visitas'}`}
            className={`flex h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl border ${w.today ? 'border-brand bg-brand text-white' : 'border-hair bg-white text-ink'}`}
          >
            <span className="text-[0.75rem] font-bold" aria-hidden="true">{w.short}</span>
            <span className="tabular-nums text-[0.9375rem] font-bold" aria-hidden="true">{w.n}</span>
            <span className="tabular-nums text-[0.6875rem] font-semibold" aria-hidden="true">{w.visits.length || '—'}</span>
          </li>
        ))}
      </ol>

      {today.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-[14px] border-2 border-brand p-3">
          <div className="text-[0.75rem] font-bold tracking-[0.06em] text-brand uppercase">Hoy</div>
          {today.map((s) => {
            const low = lowOf(s.id)
            return (
              <div key={s.id}>
                <div className="text-[0.9375rem] font-bold text-ink">{s.name}</div>
                <div className={`text-[0.875rem] font-semibold ${low ? 'text-warn' : 'text-ink-2'}`}>
                  {low ? `${low} ${low === 1 ? 'producto suyo' : 'productos suyos'} bajo mínimo` : 'Inventario al día con este proveedor'}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="rounded-[14px] bg-paper p-3 text-[0.875rem] text-ink-2">Hoy no visita ningún proveedor.</p>
      )}

      <div>
        <div className="mb-1 text-[0.875rem] font-semibold text-ink">Órdenes abiertas</div>
        {open.length === 0 && <p className="text-[0.875rem] text-ink-2">No hay órdenes en borrador ni enviadas.</p>}
        {open.map((o) => (
          <div key={o.id} className="tabular-nums flex items-center gap-2.5 border-t border-paper-2 py-2 text-[0.875rem]">
            <span className="min-w-0 flex-1 truncate text-ink">{supName(o.supplier_id)}</span>
            <span className="font-bold text-ink">{formatCRC(o.total)}</span>
            <span
              className={`w-[76px] rounded-full py-0.5 text-center text-[0.75rem] font-bold ${o.status === 'enviada' ? 'bg-warn-tint text-warn' : 'bg-paper-2 text-ink-2'}`}
            >
              {o.status === 'enviada' ? 'Enviada' : 'Borrador'}
            </span>
          </div>
        ))}
      </div>
    </ModuleCard>
  )
}
