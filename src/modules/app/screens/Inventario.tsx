import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Card, ProgressBar, ScreenHeader, Segmented } from '../components'
import { useAdjustStock, useProducts, useStockMovements } from '@/lib/data'
import { formatCRC, type MovementReason, type Product } from '@/lib/types'

function statusOf(st: number, min: number): { label: string; tone: 'teal' | 'amber' | 'rose' } {
  if (st <= 0) return { label: 'Agotado', tone: 'rose' }
  if (st <= min) return { label: 'Bajo', tone: 'amber' }
  return { label: 'Al día', tone: 'teal' }
}

const REASONS: { id: MovementReason; label: string; sign: 1 | -1 }[] = [
  { id: 'entrada', label: 'Entrada', sign: 1 },
  { id: 'merma', label: 'Merma', sign: -1 },
  { id: 'robo', label: 'Robo', sign: -1 },
  { id: 'vencimiento', label: 'Vencimiento', sign: -1 },
  { id: 'ajuste', label: 'Ajuste', sign: 1 },
]

const REASON_LABEL: Record<MovementReason, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  entrada: 'Entrada',
  merma: 'Merma',
  robo: 'Robo',
  vencimiento: 'Vencimiento',
  ajuste: 'Ajuste',
}

type Filter = 'todos' | 'atencion' | 'ok'

export function Inventario() {
  const { data: products = [], isLoading } = useProducts()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [sel, setSel] = useState<Product | null>(null)

  const critical = products.filter((p) => p.stock_qty <= p.min_qty).length
  const filtered = useMemo(
    () =>
      products
        .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(q.toLowerCase()))
        .filter((p) => (filter === 'todos' ? true : filter === 'atencion' ? p.stock_qty <= p.min_qty : p.stock_qty > p.min_qty))
        // En "Atención", primero lo agotado y lo más lejos del mínimo
        .sort((a, b) => (filter === 'atencion' ? a.stock_qty / Math.max(1, a.min_qty) - b.stock_qty / Math.max(1, b.min_qty) : 0)),
    [products, q, filter],
  )

  return (
    <div>
      <ScreenHeader
        title="Inventario"
        subtitle={isLoading ? 'Cargando…' : `${products.length} productos · ${critical} requieren atención`}
      />

      <label className="mb-3 flex h-12 items-center gap-2 rounded-[14px] border border-hair bg-white px-3.5">
        <Search size={20} className="text-ink-2" aria-hidden="true" />
        <span className="sr-only">Buscar en inventario</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto o código"
          className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-3 focus:outline-none"
        />
      </label>

      <Segmented<Filter>
        label="Filtrar por estado"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'todos', label: <>Todos <span className="tabular-nums text-ink-2">{products.length}</span></> },
          { id: 'atencion', label: <>Atención <span className="tabular-nums text-warn">{critical}</span></> },
          { id: 'ok', label: <>Al día <span className="tabular-nums text-ink-2">{products.length - critical}</span></> },
        ]}
      />

      <Card className="overflow-hidden">
        {filtered.length === 0 && !isLoading && (
          <p className="px-4 py-8 text-center text-[0.9375rem] text-ink-2">No hay productos con ese filtro.</p>
        )}
        {filtered.map((p) => {
          const s = statusOf(p.stock_qty, p.min_qty)
          const pct = p.min_qty > 0 ? Math.max(4, Math.round((p.stock_qty / (p.min_qty * 2)) * 100)) : 100
          return (
            <button
              key={p.id}
              onClick={() => setSel(p)}
              className="flex w-full flex-col gap-1.5 border-b border-paper-2 px-3.5 py-3 text-left last:border-b-0"
            >
              <span className="flex w-full justify-between gap-2">
                <span className="text-[0.9375rem] font-semibold text-ink">{p.name}</span>
                <span className="tabular-nums shrink-0 text-[0.9375rem] font-bold text-ink">
                  {p.stock_qty} <span className="text-[0.8125rem] font-medium text-ink-2">/ mín {p.min_qty}</span>
                </span>
              </span>
              <ProgressBar pct={pct} tone={s.tone === 'rose' ? 'danger' : s.tone === 'amber' ? 'warn' : 'brand'} />
              <span className="flex w-full justify-between text-[0.8125rem] text-ink-2">
                <span className="tabular-nums">{formatCRC(p.sale_price)}</span>
                <span className={`font-bold ${s.tone === 'rose' ? 'text-danger' : s.tone === 'amber' ? 'text-warn' : 'text-brand'}`}>{s.label}</span>
              </span>
            </button>
          )
        })}
      </Card>

      {sel && <AdjustSheet product={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function AdjustSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const adjust = useAdjustStock()
  const { data: movements = [] } = useStockMovements(product.id)
  const [reason, setReason] = useState<MovementReason>('entrada')
  const [qty, setQty] = useState('')

  const reasonDef = REASONS.find((r) => r.id === reason)!
  const apply = async () => {
    const n = Number(qty)
    if (!n || n <= 0) return
    await adjust.mutateAsync({ productId: product.id, delta: reasonDef.sign * n, reason })
    setQty('')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div className="mx-auto max-h-[88%] w-full max-w-[440px] overflow-y-auto rounded-t-[22px] bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-[1.125rem] font-bold text-ink">{product.name}</h2>
            <p className="text-[0.875rem] text-ink-2">
              Stock actual: <b className="tabular-nums">{product.stock_qty}</b> · mín {product.min_qty}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2">
            <X size={22} />
          </button>
        </div>

        <div className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink-2">
          <SlidersHorizontal size={15} className="text-brand" /> Ajustar inventario
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setReason(r.id)}
              className={`rounded-full h-9 px-3.5 text-[0.875rem] font-semibold ${
                reason === r.id ? 'bg-brand text-white' : 'border border-hair-strong text-ink-2'
              }`}
            >
              {r.label} {r.sign > 0 ? '+' : '−'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Cantidad"
            className="flex-1 h-12 rounded-[14px] border border-hair-strong bg-white px-3.5 text-[0.9375rem] outline-none focus:border-brand"
          />
          <button
            onClick={apply}
            disabled={adjust.isPending}
            className="rounded-2xl bg-brand px-5 py-2.5 text-[0.9375rem] font-semibold text-white disabled:opacity-60"
          >
            {adjust.isPending ? '…' : 'Aplicar'}
          </button>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[0.875rem] font-semibold text-ink-2">Movimientos recientes</div>
          {movements.length === 0 ? (
            <p className="text-[0.875rem] text-ink-3">Sin movimientos.</p>
          ) : (
            <div className="space-y-1.5">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-[0.875rem]">
                  <span className="text-ink-2">{REASON_LABEL[m.reason] ?? m.reason}</span>
                  <span className="text-ink-3">{new Date(m.created_at).toLocaleString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className={`tabular-nums font-semibold ${m.delta < 0 ? 'text-danger' : 'text-brand'}`}>
                    {m.delta > 0 ? '+' : ''}
                    {m.delta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
