import { useProducts, useTodayMovementsSummary } from '@/lib/data'
import { formatCRC, type MovementReason } from '@/lib/types'
import { ModuleCard, StackBar } from './ui'

const REASON: Record<MovementReason, [string, string]> = {
  sale: ['venta', 'ventas'],
  purchase: ['compra', 'compras'],
  entrada: ['entrada', 'entradas'],
  merma: ['merma', 'mermas'],
  robo: ['robo', 'robos'],
  vencimiento: ['vencimiento', 'vencimientos'],
  ajuste: ['ajuste', 'ajustes'],
}

export function InventarioCard() {
  const { data: products = [] } = useProducts()
  const { data: moves = {} } = useTodayMovementsSummary()

  const out = products.filter((p) => p.stock_qty <= 0)
  const low = products.filter((p) => p.stock_qty > 0 && p.stock_qty <= p.min_qty)
  const ok = products.length - out.length - low.length
  const value = products.reduce((a, p) => a + Math.max(0, p.stock_qty) * p.cost_price, 0)
  const critical = [...out, ...low].sort((a, b) => a.stock_qty / Math.max(1, a.min_qty) - b.stock_qty / Math.max(1, b.min_qty)).slice(0, 5)
  const movesText = (Object.entries(moves) as [MovementReason, { count: number }][])
    .sort((a, b) => b[1].count - a[1].count)
    .map(([r, v]) => `${v.count} ${REASON[r][v.count === 1 ? 0 : 1]}`)
    .join(' · ')

  return (
    <ModuleCard label="Inventario" title={`${products.length} productos · ${formatCRC(value)}`} to="/app/inventario">
      <div>
        <StackBar
          label={`${out.length} agotados, ${low.length} bajo mínimo, ${ok} al día`}
          parts={[
            { value: out.length, color: 'var(--m-danger)' },
            { value: low.length, color: '#D97706' },
            { value: ok, color: 'var(--m-brand-tint)' },
          ]}
        />
        <div className="tabular-nums mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8125rem] text-ink-2">
          <span>
            <b className="text-danger">{out.length}</b> agotados
          </span>
          <span>
            <b className="text-warn">{low.length}</b> bajo mínimo
          </span>
          <span>
            <b className="text-brand">{ok}</b> al día
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        {critical.length === 0 && <p className="text-[0.875rem] text-ink-2">Todo el inventario está sobre el mínimo.</p>}
        {critical.map((p) => (
          <div key={p.id} className="flex flex-col gap-1.5 border-t border-paper-2 py-2">
            <div className="tabular-nums flex justify-between gap-2 text-[0.875rem]">
              <span className="truncate font-semibold text-ink">{p.name}</span>
              <span className="shrink-0">
                <b>{p.stock_qty}</b> <span className="text-ink-2">/ mín {p.min_qty}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
              <div
                className={`h-full rounded-full ${p.stock_qty <= 0 ? 'bg-danger' : 'bg-[#D97706]'}`}
                style={{ width: `${Math.max(4, Math.round((p.stock_qty / Math.max(1, p.min_qty * 2)) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-paper-2 pt-2.5 text-[0.8125rem] text-ink-2">Movimientos hoy: {movesText || 'ninguno'}</div>
    </ModuleCard>
  )
}
