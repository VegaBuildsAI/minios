import { Link } from 'react-router-dom'
import { useCaptureStats, useProducts, useSuppliers } from '@/lib/data'
import { usePendingTickets } from '@/lib/tickets'
import { DAYS, visitsOn } from '@/lib/visits'

interface Item {
  key: string
  tag: string
  text: string
  cta: string
  to: string
  tone: 'danger' | 'warn' | 'brand'
}

const TONE = {
  danger: { box: 'bg-danger-tint', fg: 'text-danger', dot: 'bg-danger' },
  warn: { box: 'bg-warn-tint', fg: 'text-warn', dot: 'bg-[#D97706]' },
  brand: { box: 'bg-brand-tint', fg: 'text-brand', dot: 'bg-brand' },
}

const list = (names: string[]) => (names.length <= 2 ? names.join(' y ') : `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`)

/** Franja «Requiere atención»: solo lo que hoy pide una acción. Se oculta si no hay nada. */
export function Attention() {
  const { data: products = [] } = useProducts()
  const { data: suppliers = [] } = useSuppliers()
  const { data: caps } = useCaptureStats()
  const pendingTickets = usePendingTickets()

  const out = products.filter((p) => p.stock_qty <= 0)
  const review = caps?.byStatus.borrador ?? 0
  const visiting = suppliers.filter((s) => visitsOn(s, DAYS[new Date().getDay()]))

  const items: Item[] = []
  if (out.length)
    items.push({ key: 'out', tag: 'Inventario', text: `${list(out.map((p) => p.name))} ${out.length === 1 ? 'agotado' : 'agotados'}`, cta: 'Pedir', to: '/app/inventario', tone: 'danger' })
  if (pendingTickets.length)
    items.push({ key: 'tix', tag: 'Caja', text: `${pendingTickets.length} ${pendingTickets.length === 1 ? 'tiquete sin registrar' : 'tiquetes sin registrar'}`, cta: 'Registrar', to: '/app/caja', tone: 'warn' })
  if (review)
    items.push({ key: 'bit', tag: 'Bitácora', text: `${review} ${review === 1 ? 'entrada espera' : 'entradas esperan'} revisión`, cta: 'Revisar', to: '/app/bitacora', tone: 'warn' })
  if (visiting.length)
    items.push({ key: 'sup', tag: 'Proveedores', text: `${list(visiting.map((s) => s.name))} ${visiting.length === 1 ? 'visita' : 'visitan'} hoy`, cta: 'Ver orden', to: '/app/proveedores', tone: 'brand' })

  if (!items.length) return null
  return (
    <section aria-label="Requiere atención" className="flex flex-wrap gap-2.5">
      {items.map((it) => {
        const t = TONE[it.tone]
        return (
          <Link key={it.key} to={it.to} className={`flex min-h-11 flex-[1_1_260px] items-center gap-3 rounded-[14px] px-3.5 py-3 text-ink ${t.box}`}>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className={`block text-[0.875rem] font-bold ${t.fg}`}>{it.tag}</span>
              <span className="block text-[0.875rem]">{it.text}</span>
            </span>
            <span className={`text-[0.875rem] font-bold ${t.fg}`}>{it.cta}</span>
          </Link>
        )
      })}
    </section>
  )
}
