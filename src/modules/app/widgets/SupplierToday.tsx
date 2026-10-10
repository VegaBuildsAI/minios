import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Truck } from 'lucide-react'
import { Card, Chip } from '../components'
import { useProducts, useSuppliers } from '@/lib/data'
import type { Supplier } from '@/lib/types'
import { DAYS, DAY_LABEL, visitsOn } from '@/lib/visits'

/** Proveedores que visitan hoy; si hoy no viene nadie, los del próximo día con visita. */
export function SupplierToday() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const { data: products = [] } = useProducts()

  const { suppliersToShow, when, isToday } = useMemo(() => {
    const dow = new Date().getDay()
    const today = suppliers.filter((s) => visitsOn(s, DAYS[dow]))
    if (today.length > 0) return { suppliersToShow: today, when: 'Hoy', isToday: true }
    for (let offset = 1; offset <= 7; offset++) {
      const day = DAYS[(dow + offset) % 7]
      const next = suppliers.filter((s) => visitsOn(s, day))
      if (next.length > 0) {
        return { suppliersToShow: next, when: offset === 1 ? 'Mañana' : DAY_LABEL[day], isToday: false }
      }
    }
    return { suppliersToShow: [] as Supplier[], when: '', isToday: false }
  }, [suppliers])

  const lowBySupplier = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of products) {
      if (p.supplier_id && p.stock_qty <= p.min_qty) m[p.supplier_id] = (m[p.supplier_id] ?? 0) + 1
    }
    return m
  }, [products])

  return (
    <>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[0.9375rem] font-semibold text-ink">
          <Truck size={16} className="text-brand" /> {isToday || suppliersToShow.length === 0 ? 'Proveedor visita hoy' : 'Próxima visita de proveedor'}
        </div>
        <Link to="/app/proveedores" className="text-[0.8125rem] font-semibold text-brand">
          Ver pedidos
        </Link>
      </div>

      {suppliersToShow.length === 0 ? (
        <Link to="/app/proveedores">
          <Card className="mb-4 flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper-2 text-ink-3">
              <Truck size={20} />
            </div>
            <div className="flex-1 text-[0.875rem] text-ink-2">
              {isLoading
                ? 'Cargando proveedores…'
                : suppliers.length === 0
                  ? 'Aún no hay proveedores cargados.'
                  : 'Ningún proveedor tiene días de visita configurados.'}
            </div>
            <ChevronRight size={18} className="text-ink-3" />
          </Card>
        </Link>
      ) : (
        <div className="mb-4 space-y-2.5">
          {suppliersToShow.slice(0, 3).map((s) => {
            const low = lowBySupplier[s.id] ?? 0
            return (
              <Link key={s.id} to="/app/proveedores">
                <Card className="flex items-center gap-3 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-tint text-brand">
                    <Truck size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.9375rem] font-semibold text-ink">{s.name}</div>
                    <div className="text-[0.875rem] text-ink-2">
                      {when}
                      {low > 0 ? ` · ${low} ${low === 1 ? 'producto' : 'productos'} bajo mínimo` : ' · inventario al día'}
                    </div>
                  </div>
                  {low > 0 ? <Chip tone="amber">Pedir</Chip> : null}
                  <ChevronRight size={18} className="text-ink-3" />
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
