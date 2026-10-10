import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2, Plus, RotateCw, Trash2, X } from 'lucide-react'
import { useCaptures, useParseCapture, useProducts, useRegisterTicket, useSignedUrl } from '@/lib/data'
import { matchProduct } from '@/lib/match'
import { formatCRC, type Capture, type PaymentMethod, type Product } from '@/lib/types'
import { Segmented } from '../components'

interface Row {
  desc: string
  productId: string
  qty: string
  price: string
  auto: boolean
}

const PAYMENTS: { id: PaymentMethod; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'sinpe', label: 'SINPE' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'fiado', label: 'Fiado' },
]

function rowsFrom(c: Capture, products: Product[]): Row[] {
  return (c.parsed_json?.ai?.lineas ?? []).map((l) => {
    const m = matchProduct(l.d, products)
    const qty = l.c ?? 1
    const price = l.p ?? (l.t != null && qty ? l.t / qty : (m.product?.sale_price ?? null))
    return { desc: l.d, productId: m.product?.id ?? '', qty: String(qty), price: price != null ? String(price) : '', auto: !!m.product }
  })
}

/**
 * Revisión de un tiquete de la registradora leído por la IA. Cada línea se enruta a un
 * producto del inventario (obligatorio); al registrar, se guarda la venta y baja el stock.
 */
export function TicketSheet({ captureId, shiftId, onClose }: { captureId: string; shiftId: string | null; onClose: () => void }) {
  const { data: captures = [] } = useCaptures()
  const { data: products = [] } = useProducts()
  const capture = captures.find((c) => c.id === captureId)
  const parse = useParseCapture()
  const register = useRegisterTicket()
  const { data: photoUrl } = useSignedUrl(capture?.file_path ?? null)

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState('')
  const [tax, setTax] = useState('')
  const [number, setNumber] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('efectivo')
  const [ready, setReady] = useState(false)

  const ai = capture?.parsed_json?.ai
  const reading = !capture || capture.ai_status === 'procesando' || capture.ai_status === 'sin_procesar'

  // Se llena una sola vez, cuando la IA termina y ya cargaron los productos.
  const initKey = `${capture?.id}:${capture?.ai_status}:${products.length > 0}`
  useEffect(() => {
    if (ready || !capture || capture.ai_status !== 'listo' || !products.length) return
    setRows(rowsFrom(capture, products))
    setTotal(ai?.total != null ? String(ai.total) : '')
    setTax(ai?.iva != null ? String(ai.iva) : '')
    setNumber(ai?.numero ?? '')
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initKey])

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const pick = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId)
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, productId, auto: false, price: r.price || (p ? String(p.sale_price) : '') } : r)))
  }

  const sum = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.price) || 0), 0)
  const totalN = Number(total) || 0
  const missing = rows.filter((r) => !r.productId).length
  const badNums = rows.some((r) => !(Number(r.qty) > 0) || r.price === '' || Number(r.price) < 0)
  const mismatch = totalN > 0 && rows.length > 0 && Math.abs(sum - totalN) > 1
  const canSave = rows.length > 0 && missing === 0 && !badNums && totalN > 0 && !register.isPending

  const save = async () => {
    await register.mutateAsync({
      captureId,
      shiftId,
      payment,
      number,
      total: totalN,
      tax: Number(tax) || 0,
      lines: rows.map((r) => ({ product_id: r.productId, qty: Number(r.qty), price: Number(r.price) })),
    })
    onClose()
  }

  const manual = () => {
    setRows([{ desc: '', productId: '', qty: '1', price: '', auto: false }])
    setReady(true)
  }

  const input = 'w-full rounded-xl border border-hair-strong bg-white px-3 py-2 tabular-nums text-[0.9375rem] text-ink outline-none focus:border-brand'

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-paper">
      <header className="flex items-center gap-2.5 border-b border-hair bg-white px-3 py-3">
        <button onClick={onClose} aria-label="Cerrar tiquete" className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-paper-2">
          <X size={22} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h2 className="font-display-m text-[1.25rem] leading-tight font-bold text-ink">Registrar tiquete</h2>
          <div className="text-[0.8125rem] text-ink-2">Enrutá cada producto al inventario</div>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {photoUrl && (
          <a href={photoUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[18px] border border-hair bg-white">
            <img src={photoUrl} alt="Foto del tiquete" className="max-h-44 w-full object-contain" />
          </a>
        )}

        {!ready && reading && (
          <div className="flex items-center justify-center gap-2 rounded-[18px] border border-hair bg-white py-8 text-[0.9375rem] text-ink-2">
            <Loader2 size={18} className="animate-spin text-brand" /> Leyendo el tiquete…
          </div>
        )}

        {!ready && capture?.ai_status === 'error' && (
          <div className="rounded-[18px] border border-danger-tint bg-white p-4">
            <p className="text-[0.9375rem] text-danger">{capture.ai_error ?? 'No se pudo leer el tiquete.'}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => parse.mutate({ id: captureId, force: true })}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-hair-strong text-[0.875rem] font-semibold text-ink"
              >
                <RotateCw size={16} /> Reintentar
              </button>
              <button onClick={manual} className="h-11 flex-1 rounded-xl bg-ink text-[0.875rem] font-semibold text-white">
                Ingresar a mano
              </button>
            </div>
          </div>
        )}

        {ready && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="text-[0.8125rem] font-semibold text-ink-2">
                Total del tiquete (₡)
                <input type="number" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className={`mt-1 ${input}`} />
              </label>
              <label className="text-[0.8125rem] font-semibold text-ink-2">
                N.° de tiquete
                <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Opcional" className={`mt-1 ${input}`} />
              </label>
            </div>

            <Segmented<PaymentMethod> label="Método de pago" value={payment} onChange={setPayment} options={PAYMENTS} />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[0.875rem] font-semibold text-ink-2">Productos del tiquete</span>
              {missing > 0 && <span className="text-[0.8125rem] font-semibold text-warn">{missing} sin producto</span>}
            </div>

            {rows.map((r, i) => (
              <div key={i} className={`rounded-[18px] border bg-white p-3 ${r.productId ? 'border-hair' : 'border-warn'}`}>
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <span className="min-w-0 text-[0.8125rem] text-ink-2">
                    {r.desc || 'Línea agregada a mano'}
                    {r.auto && <span className="ml-1.5 rounded bg-brand-tint px-1 font-semibold text-brand">auto</span>}
                  </span>
                  <button
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    aria-label={`Quitar línea ${r.desc || i + 1}`}
                    className="-mt-1 -mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-tint"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <select
                  value={r.productId}
                  onChange={(e) => pick(i, e.target.value)}
                  aria-label="Producto del inventario"
                  className="mb-2 w-full rounded-xl border border-hair-strong bg-white px-2.5 py-2 text-[0.9375rem] text-ink outline-none focus:border-brand"
                >
                  <option value="">— Elegí el producto —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <label className="flex-1 text-[0.8125rem] text-ink-3">
                    Cantidad
                    <input type="number" inputMode="decimal" value={r.qty} onChange={(e) => set(i, { qty: e.target.value })} className={`mt-0.5 ${input}`} />
                  </label>
                  <label className="flex-1 text-[0.8125rem] text-ink-3">
                    Precio unit. (₡)
                    <input type="number" inputMode="decimal" value={r.price} onChange={(e) => set(i, { price: e.target.value })} className={`mt-0.5 ${input}`} />
                  </label>
                </div>
              </div>
            ))}

            <button
              onClick={() => setRows((rs) => [...rs, { desc: '', productId: '', qty: '1', price: '', auto: false }])}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-hair-strong text-[0.875rem] font-semibold text-ink-2"
            >
              <Plus size={16} /> Agregar producto
            </button>

            {ai && ai.revisar.length > 0 && (
              <div className="rounded-xl bg-warn-tint px-3 py-2 text-[0.8125rem] text-warn">
                {ai.revisar.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {ready && (
        <div className="shrink-0 border-t border-hair bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="mb-2 flex justify-between text-[0.875rem] text-ink-2">
            <span>Suma de productos</span>
            <span className="tabular-nums">{formatCRC(sum)}</span>
          </div>
          {mismatch && (
            <p className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-warn">
              <AlertTriangle size={14} /> No coincide con el total del tiquete ({formatCRC(totalN)}). Revisá cantidades y precios.
            </p>
          )}
          <button
            onClick={save}
            disabled={!canSave}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-50"
          >
            {register.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {register.isPending ? 'Registrando…' : `Registrar ${formatCRC(totalN)}`}
          </button>
          {!canSave && !register.isPending && (
            <p className="mt-1.5 text-center text-[0.8125rem] text-ink-3">
              {missing > 0 ? 'Elegí el producto de cada línea para registrar.' : totalN <= 0 ? 'Falta el total del tiquete.' : rows.length === 0 ? 'Agregá al menos un producto.' : 'Revisá cantidades y precios.'}
            </p>
          )}
          {register.isError && <p className="mt-2 text-center text-[0.875rem] text-danger">{(register.error as Error).message}</p>}
        </div>
      )}
    </div>
  )
}
