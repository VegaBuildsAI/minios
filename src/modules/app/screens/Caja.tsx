import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, Check, CreditCard, Minus, NotebookPen, Plus, ScanLine, Search, Smartphone, Trash2, X, type LucideIcon } from 'lucide-react'
import {
  useCategories,
  useCheckout,
  useCloseShiftMutation,
  useOpenShift,
  useOpenShiftMutation,
  useProducts,
  useTodaySales,
} from '@/lib/data'
import { IVA_RATE, formatCRC, type CartLine, type PaymentMethod, type Product } from '@/lib/types'

const METHODS: { id: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'sinpe', label: 'SINPE', icon: Smartphone },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'fiado', label: 'Fiado', icon: NotebookPen },
]

export function Caja() {
  const navigate = useNavigate()
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const { data: shift } = useOpenShift()
  const { data: todaySales = [] } = useTodaySales()
  const checkout = useCheckout()
  const openShift = useOpenShiftMutation()
  const closeShift = useCloseShiftMutation()

  const [cat, setCat] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [sheet, setSheet] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('efectivo')
  const [received, setReceived] = useState('')
  const [doneSale, setDoneSale] = useState<{ total: number } | null>(null)
  const [turnoSheet, setTurnoSheet] = useState(false)
  const [openingCash, setOpeningCash] = useState('')
  const [closingCash, setClosingCash] = useState('')

  const efectivoHoy = todaySales
    .filter((s) => s.payment_method === 'efectivo' && (!shift || s.shift_id === shift.id))
    .reduce((s, r) => s + Number(r.total), 0)
  const expectedCash = (shift?.opening_cash ?? 0) + efectivoHoy
  const cashDiff = closingCash ? Number(closingCash) - expectedCash : 0

  const filtered = useMemo(() => {
    return products.filter(
      (p) =>
        (!cat || p.category_id === cat) &&
        (!q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(q.toLowerCase())),
    )
  }, [products, cat, q])

  const add = (p: Product) =>
    setCart((c) => {
      const ex = c.find((l) => l.product.id === p.id)
      if (ex) return c.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l))
      return [...c, { product: p, qty: 1 }]
    })
  const setQty = (id: string, d: number) =>
    setCart((c) =>
      c
        .map((l) => (l.product.id === id ? { ...l, qty: l.qty + d } : l))
        .filter((l) => l.qty > 0),
    )
  const removeLine = (id: string) => setCart((c) => c.filter((l) => l.product.id !== id))

  const inCart: Record<string, number> = Object.fromEntries(cart.map((l) => [l.product.id, l.qty]))
  const count = cart.reduce((s, l) => s + l.qty, 0)
  const subtotal = cart.reduce((s, l) => s + l.product.sale_price * l.qty, 0)
  const tax = subtotal * IVA_RATE
  const total = subtotal + tax
  const change = method === 'efectivo' && received ? Math.max(0, Number(received) - total) : 0

  const cobrar = async () => {
    if (cart.length === 0) return
    await checkout.mutateAsync({ cart, paymentMethod: method, shiftId: shift?.id ?? null })
    setDoneSale({ total })
    setCart([])
    setReceived('')
  }

  return (
    <div className="mostrador fixed inset-0 z-50 mx-auto flex max-w-[440px] flex-col bg-paper text-ink">
      {/* Top bar */}
      <header className="flex items-center gap-2.5 border-b border-hair bg-white px-3 py-3">
        <button onClick={() => navigate('/app')} aria-label="Volver al inicio" className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-paper-2">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="font-display-m text-[1.375rem] leading-tight font-bold text-ink">Caja</h1>
          <div className="text-[0.8125rem] text-ink-2">{shift ? `Turno abierto · ${formatCRC(shift.opening_cash)} apertura` : 'Sin turno abierto'}</div>
        </div>
        <button
          onClick={() => setTurnoSheet(true)}
          className={`flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[0.875rem] font-semibold ${
            shift ? 'border-hair bg-white text-ink' : 'border-warn-tint bg-warn-tint text-warn'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${shift ? 'bg-ok' : 'bg-warn'}`} aria-hidden="true" /> {shift ? 'Cerrar turno' : 'Abrir turno'}
        </button>
      </header>

      {/* Search + categories */}
      <div className="px-4 pt-3 pb-2">
        <label className="mb-2.5 flex h-12 items-center gap-2 rounded-[14px] border border-hair bg-white px-3.5">
          <Search size={20} className="text-ink-2" aria-hidden="true" />
          <span className="sr-only">Buscar producto</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar o escanear código"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
          />
          <ScanLine size={20} className="text-brand" aria-hidden="true" />
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Pill active={cat === null} onClick={() => setCat(null)}>
            Todos
          </Pill>
          {categories.map((c) => (
            <Pill key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              {c.name}
            </Pill>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="py-10 text-center text-ink-3">Cargando productos…</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {filtered.map((p) => {
              const out = p.stock_qty <= 0
              return (
                <button
                  key={p.id}
                  disabled={out}
                  onClick={() => add(p)}
                  className={`relative flex min-h-[104px] flex-col justify-between gap-2 rounded-2xl border bg-white p-3 text-left transition-transform active:scale-95 ${
                    out ? 'cursor-not-allowed border-hair opacity-60' : 'border-hair hover:border-brand'
                  }`}
                >
                  <div className="line-clamp-2 text-[0.9375rem] leading-snug font-semibold text-ink">{p.name}</div>
                  <div className="flex items-end justify-between gap-2">
                    <span className="tabular-nums text-[1.0625rem] font-bold text-ink">{formatCRC(p.sale_price)}</span>
                    <span className={`tabular-nums text-[0.75rem] font-semibold ${out ? 'text-danger' : p.stock_qty <= p.min_qty ? 'text-warn' : 'text-ink-2'}`}>
                      {out ? 'Agotado' : p.stock_qty <= p.min_qty ? `inv. ${p.stock_qty} · bajo` : `inv. ${p.stock_qty}`}
                    </span>
                  </div>
                  {inCart[p.id] > 0 && (
                    <span className="tabular-nums absolute -top-1.5 -right-1.5 flex h-[26px] min-w-[26px] items-center justify-center rounded-full border-2 border-paper bg-brand px-1.5 text-[0.8125rem] font-bold text-white">
                      {inCart[p.id]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart bar */}
      {count > 0 && (
        <div className="shrink-0 rounded-t-[22px] border-t border-hair bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-10px_30px_-18px_rgba(27,31,28,0.35)]">
          <button
            onClick={() => setSheet(true)}
            className="flex h-14 w-full items-center gap-2.5 rounded-2xl bg-brand px-4 text-white"
          >
            <span className="tabular-nums flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-marigold px-2 text-[0.875rem] font-bold text-ink">
              {count}
            </span>
            <span className="flex-1 text-left text-[1.0625rem] font-bold">Cobrar</span>
            <span className="font-display-m tabular-nums text-[1.375rem] font-bold">{formatCRC(total)}</span>
          </button>
          <p className="tabular-nums mt-1.5 text-center text-[0.8125rem] text-ink-2">
            Subtotal {formatCRC(subtotal)} + IVA {formatCRC(tax)} · tocá para ver el carrito
          </p>
        </div>
      )}

      {/* Cart sheet */}
      {sheet && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/30" onClick={() => setSheet(false)}>
          <div
            className="max-h-[85%] overflow-y-auto rounded-t-[22px] bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[1.125rem] font-bold text-ink">Carrito</h2>
              <button onClick={() => setSheet(false)} aria-label="Cerrar" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2">
                <X size={22} />
              </button>
            </div>

            <div className="space-y-2">
              {cart.map((l) => (
                <div key={l.product.id} className="flex items-center gap-2 rounded-2xl bg-paper p-2.5">
                  <div className="flex-1">
                    <div className="text-[0.875rem] font-semibold text-ink">{l.product.name}</div>
                    <div className="tabular-nums text-[0.8125rem] text-ink-2">{formatCRC(l.product.sale_price)}</div>
                  </div>
                  <button onClick={() => setQty(l.product.id, -1)} aria-label={`Quitar uno de ${l.product.name}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-hair bg-white text-ink">
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center tabular-nums text-[0.9375rem] font-semibold">{l.qty}</span>
                  <button onClick={() => setQty(l.product.id, 1)} aria-label={`Agregar uno de ${l.product.name}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-hair bg-white text-ink">
                    <Plus size={18} aria-hidden="true" />
                  </button>
                  <button onClick={() => removeLine(l.product.id)} aria-label={`Eliminar ${l.product.name}`} className="flex h-11 w-9 items-center justify-center text-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 border-t border-hair pt-3 text-[0.9375rem]">
              <Row label="Subtotal" value={formatCRC(subtotal)} />
              <Row label="IVA (13%)" value={formatCRC(tax)} />
              <div className="flex justify-between pt-1 text-[1.125rem] font-bold text-ink">
                <span>Total</span>
                <span className="tabular-nums text-brand">{formatCRC(total)}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-[0.875rem] font-semibold text-ink-2">Método de pago</div>
              <div className="grid grid-cols-4 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    aria-pressed={method === m.id}
                    className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border py-2 text-[0.8125rem] font-semibold ${
                      method === m.id ? 'border-2 border-brand bg-brand-tint text-brand' : 'border-hair-strong text-ink'
                    }`}
                  >
                    <m.icon size={20} aria-hidden="true" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {method === 'efectivo' && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder="Efectivo recibido"
                  className="flex-1 h-12 rounded-[14px] border border-hair-strong bg-white px-3.5 text-[0.9375rem] outline-none focus:border-brand"
                />
                <div className="text-right">
                  <div className="text-[0.8125rem] text-ink-3">Cambio</div>
                  <div className="tabular-nums text-base font-bold text-ink">{formatCRC(change)}</div>
                </div>
              </div>
            )}

            <button
              onClick={cobrar}
              disabled={checkout.isPending}
              className="mt-4 w-full rounded-2xl bg-brand py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {checkout.isPending ? 'Procesando…' : `Cobrar ${formatCRC(total)}`}
            </button>
            {checkout.isError && (
              <p className="mt-2 text-center text-[0.875rem] text-danger">
                Error al cobrar: {(checkout.error as Error).message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Turno sheet */}
      {turnoSheet && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/30" onClick={() => setTurnoSheet(false)}>
          <div className="rounded-t-[22px] bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[1.125rem] font-bold text-ink">{shift ? 'Cierre de turno' : 'Abrir turno'}</h2>
              <button onClick={() => setTurnoSheet(false)} aria-label="Cerrar" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2">
                <X size={22} />
              </button>
            </div>

            {shift ? (
              <>
                <div className="mb-1 flex justify-between text-[0.875rem] text-ink-2">
                  <span>Apertura</span>
                  <span className="tabular-nums">{formatCRC(shift.opening_cash)}</span>
                </div>
                <div className="mb-1 flex justify-between text-[0.875rem] text-ink-2">
                  <span>Ventas en efectivo</span>
                  <span className="tabular-nums">{formatCRC(efectivoHoy)}</span>
                </div>
                <div className="mb-3 flex justify-between border-t border-hair pt-2 text-[0.9375rem] font-semibold text-ink">
                  <span>Efectivo esperado</span>
                  <span className="tabular-nums text-brand">{formatCRC(expectedCash)}</span>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="Efectivo contado"
                  className="mb-2 w-full h-12 rounded-[14px] border border-hair-strong bg-white px-3.5 text-[0.9375rem] outline-none focus:border-brand"
                />
                {closingCash && (
                  <p className={`mb-2 text-[0.875rem] font-semibold ${cashDiff === 0 ? 'text-brand' : cashDiff < 0 ? 'text-danger' : 'text-warn'}`}>
                    {cashDiff === 0 ? 'Cuadra exacto' : cashDiff < 0 ? `Faltante ${formatCRC(Math.abs(cashDiff))}` : `Sobrante ${formatCRC(cashDiff)}`}
                  </p>
                )}
                <button
                  onClick={async () => {
                    await closeShift.mutateAsync({ shiftId: shift.id, closingCash: Number(closingCash) || 0 })
                    setClosingCash('')
                    setTurnoSheet(false)
                  }}
                  disabled={closeShift.isPending}
                  className="w-full rounded-2xl bg-ink py-3 text-[0.9375rem] font-semibold text-white disabled:opacity-60"
                >
                  {closeShift.isPending ? 'Cerrando…' : 'Cerrar turno'}
                </button>
              </>
            ) : (
              <>
                <input
                  type="number"
                  inputMode="numeric"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="Monto inicial en caja"
                  className="mb-3 w-full h-12 rounded-[14px] border border-hair-strong bg-white px-3.5 text-[0.9375rem] outline-none focus:border-brand"
                />
                <button
                  onClick={async () => {
                    await openShift.mutateAsync({ openingCash: Number(openingCash) || 0 })
                    setOpeningCash('')
                    setTurnoSheet(false)
                  }}
                  disabled={openShift.isPending}
                  className="w-full rounded-2xl bg-brand py-3 text-[0.9375rem] font-semibold text-white disabled:opacity-60"
                >
                  {openShift.isPending ? 'Abriendo…' : 'Abrir turno'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success */}
      {doneSale && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white p-8 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-tint text-brand">
            <Check size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-[1.3rem] font-bold text-ink">Venta registrada</h2>
          <p className="mt-1 text-[0.9375rem] text-ink-2">
            {formatCRC(doneSale.total)} · inventario actualizado
          </p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
            <button
              onClick={() => {
                setDoneSale(null)
                setSheet(false)
              }}
              className="w-full rounded-2xl bg-brand py-3 text-[0.9375rem] font-semibold text-white"
            >
              Nueva venta
            </button>
            <button onClick={() => navigate('/app')} className="w-full rounded-2xl border border-hair-strong py-3 text-[0.9375rem] font-semibold text-ink-2">
              Volver al inicio
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 rounded-full px-3.5 text-[0.875rem] font-semibold transition-colors ${
        active ? 'bg-ink text-white' : 'border border-hair-strong bg-white text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-2">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
