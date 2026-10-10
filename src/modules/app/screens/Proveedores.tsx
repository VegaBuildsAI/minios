import { useMemo, useState } from 'react'
import { Check, ChevronRight, PackageCheck, Phone, Sparkles, Truck, X } from 'lucide-react'
import { Card, Chip, Eyebrow, ScreenHeader, type Tone } from '../components'
import {
  useCreateSuggestedPO,
  usePOItems,
  useProducts,
  usePurchaseOrders,
  useReceivePO,
  useSuppliers,
} from '@/lib/data'
import { formatCRC, type POStatus, type Supplier } from '@/lib/types'
import { DAYS, DAY_SHORT, visitsOn } from '@/lib/visits'

const PO_TONE: Record<POStatus, Tone> = { borrador: 'neutral', enviada: 'amber', recibida: 'brand', cancelada: 'rose' }
const PO_LABEL: Record<POStatus, string> = { borrador: 'Borrador', enviada: 'Enviada', recibida: 'Recibida', cancelada: 'Cancelada' }

export function Proveedores() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const { data: products = [] } = useProducts()
  const { data: orders = [] } = usePurchaseOrders()
  const [sel, setSel] = useState<Supplier | null>(null)

  const lowBySupplier = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of products) {
      if (p.supplier_id && p.stock_qty <= p.min_qty) map[p.supplier_id] = (map[p.supplier_id] ?? 0) + 1
    }
    return map
  }, [products])

  // Próximos 7 días, empezando hoy
  const week = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const day = DAYS[d.getDay()]
      return { i, label: DAY_SHORT[d.getDay()], date: d.getDate(), who: suppliers.filter((s) => visitsOn(s, day)) }
    })
  }, [suppliers])
  const [dayIdx, setDayIdx] = useState<number | null>(null)
  const firstWithVisit = week.find((w) => w.who.length > 0)?.i ?? 0
  const active = week[dayIdx ?? firstWithVisit]
  const whenLabel = active.i === 0 ? 'Hoy' : active.i === 1 ? 'Mañana' : `El ${active.date}`
  const openOrders = orders.filter((o) => o.status === 'borrador' || o.status === 'enviada').length
  const nameOf = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? 'Proveedor'

  return (
    <div>
      <ScreenHeader
        title="Proveedores"
        subtitle={isLoading ? 'Cargando…' : `${suppliers.length} proveedores · ${openOrders} órdenes abiertas`}
      />

      {/* Semana */}
      <div role="tablist" aria-label="Visitas de la semana" className="mb-3.5 grid grid-cols-7 gap-1">
        {week.map((w) => {
          const on = w.i === active.i
          return (
            <button
              key={w.i}
              role="tab"
              aria-selected={on}
              aria-label={`${w.i === 0 ? 'Hoy' : w.label} ${w.date}: ${w.who.length} visitas`}
              onClick={() => setDayIdx(w.i)}
              className={`flex h-16 flex-col items-center justify-center gap-1 rounded-[14px] border ${
                on ? 'border-brand bg-brand text-white' : w.i === 0 ? 'border-ink bg-white text-ink' : 'border-hair bg-white text-ink'
              }`}
            >
              <span className="text-[0.75rem] font-bold">{w.label}</span>
              <span className="tabular-nums text-base font-bold">{w.date}</span>
              <span className="flex h-1.5 gap-[3px]">
                {w.who.slice(0, 3).map((s) => (
                  <span key={s.id} className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-marigold' : 'bg-brand'}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      {/* Visitas del día elegido */}
      {active.who.length === 0 ? (
        <Card className="mb-5 p-4 text-[0.9375rem] text-ink-2">{whenLabel} no viene ningún proveedor.</Card>
      ) : (
        <div className="mb-5 space-y-3">
          {active.who.map((s) => {
            const low = lowBySupplier[s.id] ?? 0
            return (
              <section key={s.id} aria-label={`Visita de ${s.name}`} className="flex flex-col gap-3 rounded-[20px] border-2 border-brand bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Eyebrow className="text-brand">Visita · {whenLabel.toLowerCase()}</Eyebrow>
                    <div className="mt-0.5 text-[1.125rem] font-bold text-ink">{s.name}</div>
                    {s.notes && <div className="text-[0.875rem] text-ink-2">{s.notes}</div>}
                  </div>
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      aria-label={`Llamar a ${s.name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hair-strong text-brand"
                    >
                      <Phone size={20} aria-hidden="true" />
                    </a>
                  )}
                </div>
                {low > 0 ? (
                  <div className="rounded-xl bg-warn-tint px-3 py-2.5 text-[0.875rem] font-semibold text-warn">
                    {low} {low === 1 ? 'producto bajo mínimo' : 'productos bajo mínimo'}
                  </div>
                ) : (
                  <div className="rounded-xl bg-brand-tint px-3 py-2.5 text-[0.875rem] font-semibold text-brand">Inventario al día con este proveedor</div>
                )}
                <button onClick={() => setSel(s)} className="h-12 rounded-xl bg-brand text-[0.9375rem] font-bold text-white">
                  {low > 0 ? 'Armar orden' : 'Ver proveedor'}
                </button>
              </section>
            )
          })}
        </div>
      )}

      {/* Órdenes */}
      {orders.length > 0 && (
        <>
          <h2 className="mb-2 px-0.5 text-base font-bold text-ink">Órdenes de compra</h2>
          <Card className="mb-5 overflow-hidden">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center gap-3 border-b border-paper-2 px-3.5 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.9375rem] font-semibold text-ink">{nameOf(o.supplier_id)}</div>
                  <div className="tabular-nums text-[0.8125rem] text-ink-2">
                    {new Date(o.created_at).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <span className="tabular-nums text-[0.9375rem] font-bold text-ink">{formatCRC(o.total)}</span>
                <span className="w-[86px] text-right">
                  <Chip tone={PO_TONE[o.status]}>{PO_LABEL[o.status]}</Chip>
                </span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Todos los proveedores */}
      <h2 className="mb-2 px-0.5 text-base font-bold text-ink">Todos</h2>
      <Card className="overflow-hidden">
        {suppliers.map((s) => {
          const low = lowBySupplier[s.id] ?? 0
          return (
            <button key={s.id} onClick={() => setSel(s)} className="flex w-full items-center gap-3 border-b border-paper-2 px-3.5 py-3 text-left last:border-b-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper text-ink">
                <Truck size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-semibold text-ink">{s.name}</span>
                <span className="block text-[0.8125rem] text-ink-2">
                  {s.visit_days.length ? `Visita: ${s.visit_days.join(', ')}` : 'Sin días de visita'}
                </span>
              </span>
              {low > 0 && <Chip tone="amber">{low} bajo mín</Chip>}
              <ChevronRight size={18} className="text-ink-3" aria-hidden="true" />
            </button>
          )
        })}
      </Card>

      {sel && <SupplierSheet supplier={sel} lowCount={lowBySupplier[sel.id] ?? 0} onClose={() => setSel(null)} />}
    </div>
  )
}

function SupplierSheet({ supplier, lowCount, onClose }: { supplier: Supplier; lowCount: number; onClose: () => void }) {
  const { data: pos = [] } = usePurchaseOrders(supplier.id)
  const createPO = useCreateSuggestedPO()
  const [openPO, setOpenPO] = useState<string | null>(null)

  const generate = async () => {
    const res = await createPO.mutateAsync({ supplierId: supplier.id })
    if (res.poId) setOpenPO(res.poId)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div className="mx-auto max-h-[88%] w-full max-w-[440px] overflow-y-auto rounded-t-[22px] bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-[1.125rem] font-bold text-ink">{supplier.name}</h2>
            <p className="text-[0.875rem] text-ink-2">{supplier.phone ?? 'Sin teléfono'}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2">
            <X size={22} />
          </button>
        </div>

        <button
          onClick={generate}
          disabled={createPO.isPending}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-[0.9375rem] font-semibold text-white shadow-sm disabled:opacity-60"
        >
          <Sparkles size={17} />
          {createPO.isPending ? 'Generando…' : `Generar orden sugerida${lowCount ? ` (${lowCount})` : ''}`}
        </button>
        {createPO.isSuccess && createPO.data?.lines === 0 && (
          <p className="-mt-2 mb-3 text-center text-[0.875rem] text-ink-3">No hay productos bajo mínimo de este proveedor.</p>
        )}

        <div className="mb-2 text-[0.875rem] font-semibold text-ink-2">Órdenes de compra</div>
        {pos.length === 0 ? (
          <p className="text-[0.875rem] text-ink-3">Aún no hay órdenes.</p>
        ) : (
          <div className="space-y-2">
            {pos.map((po) => (
              <POCard key={po.id} poId={po.id} status={po.status} total={po.total} createdAt={po.created_at} open={openPO === po.id} onToggle={() => setOpenPO(openPO === po.id ? null : po.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function POCard({
  poId,
  status,
  total,
  createdAt,
  open,
  onToggle,
}: {
  poId: string
  status: string
  total: number
  createdAt: string
  open: boolean
  onToggle: () => void
}) {
  const { data: items = [] } = usePOItems(open ? poId : null)
  const receive = useReceivePO()
  const received = status === 'recibida'

  return (
    <div className="rounded-2xl border border-hair-strong p-3">
      <button onClick={onToggle} className="flex w-full items-center gap-2 text-left">
        <div className="flex-1">
          <div className="text-[0.875rem] font-semibold text-ink">Orden #{poId.slice(0, 4)}</div>
          <div className="text-[0.8125rem] text-ink-3">
            {new Date(createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })} · {formatCRC(total)}
          </div>
        </div>
        <Chip tone={received ? 'teal' : 'amber'}>{status}</Chip>
      </button>

      {open && (
        <div className="mt-3 border-t border-hair pt-2">
          <div className="space-y-1">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between text-[0.875rem] text-ink-2">
                <span>{it.product?.name ?? '—'}</span>
                <span className="tabular-nums">
                  {received ? `+${it.qty_received}` : `${it.qty_ordered} u`}
                </span>
              </div>
            ))}
          </div>
          {!received && (
            <button
              onClick={() => receive.mutate({ poId })}
              disabled={receive.isPending}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[0.875rem] font-semibold text-white disabled:opacity-60"
            >
              <PackageCheck size={16} />
              {receive.isPending ? 'Recibiendo…' : 'Recibir pedido (sube inventario)'}
            </button>
          )}
          {received && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.875rem] font-semibold text-brand">
              <Check size={15} /> Recibido · inventario actualizado
            </div>
          )}
        </div>
      )}
    </div>
  )
}
