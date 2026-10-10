import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, PackageCheck } from 'lucide-react'
import { useApplyInvoice, useProducts } from '@/lib/data'
import { matchProduct } from '@/lib/match'
import { formatCRC, type Capture } from '@/lib/types'
import { useAuth } from '@/modules/auth/context'

interface Row {
  desc: string
  productId: string // '' = omitir
  qty: string
  cost: string
  auto: boolean // emparejado automáticamente
}

/**
 * Aplica una factura leída por la IA al inventario. La IA propone, pero el usuario
 * revisa el emparejamiento de cada línea (producto, cantidad, costo) antes de confirmar:
 * nada entra al inventario sin este paso.
 */
export function ReceiveInvoice({ capture, onApplied }: { capture: Capture; onApplied?: () => void }) {
  const { profile } = useAuth()
  const canApply = profile?.role === 'owner' || profile?.role === 'superadmin'
  const { data: products = [] } = useProducts()
  const apply = useApplyInvoice()
  const ai = capture.parsed_json?.ai
  const applied = capture.parsed_json?.applied

  const initial = useMemo<Row[]>(
    () =>
      (ai?.lineas ?? []).map((l) => {
        const m = matchProduct(l.d, products)
        return { desc: l.d, productId: m.product?.id ?? '', qty: String(l.c ?? ''), cost: String(l.p ?? ''), auto: !!m.product }
      }),
    [ai, products],
  )
  const [rows, setRows] = useState<Row[]>([])
  // Se inicializa cuando llegan los productos (una sola vez por factura).
  const key = `${capture.id}:${products.length}`
  useEffect(() => {
    setRows(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!ai || !ai.lineas.length) return null
  if (applied) {
    return (
      <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-brand-tint px-3 py-2 text-[0.8125rem] font-medium text-brand">
        <Check size={14} /> Aplicada al inventario
      </div>
    )
  }

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const valid = rows.filter((r) => r.productId && Number(r.qty) > 0 && Number(r.cost) >= 0 && r.cost !== '')
  const total = valid.reduce((s, r) => s + Number(r.qty) * Number(r.cost), 0)
  const skipped = rows.length - valid.length

  const submit = async () => {
    await apply.mutateAsync({
      captureId: capture.id,
      supplierName: ai.proveedor,
      lines: valid.map((r) => ({ product_id: r.productId, qty: Number(r.qty), cost: Number(r.cost) })),
    })
    onApplied?.()
  }

  return (
    <div className="mt-2 rounded-2xl border border-brand-tint bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink">
        <PackageCheck size={15} className="text-brand" /> Aplicar al inventario
      </div>
      <p className="mb-2 text-[0.8125rem] text-ink-3">Revisá cada línea: elegí el producto, la cantidad y el costo. Las líneas sin producto se omiten.</p>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl bg-paper p-2">
            <div className="mb-1 truncate text-[0.8125rem] text-ink-2" title={r.desc}>
              {r.desc}
              {r.auto && <span className="ml-1.5 rounded bg-brand-tint px-1 text-[0.8125rem] font-semibold text-brand">auto</span>}
            </div>
            <select
              value={r.productId}
              onChange={(e) => set(i, { productId: e.target.value, auto: false })}
              className="mb-1.5 w-full rounded-lg border border-hair-strong bg-white px-2 py-1.5 text-[0.875rem] outline-none focus:border-brand"
            >
              <option value="">— omitir esta línea —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <label className="flex-1 text-[0.8125rem] text-ink-3">
                Cantidad
                <input
                  type="number"
                  inputMode="decimal"
                  value={r.qty}
                  onChange={(e) => set(i, { qty: e.target.value })}
                  className="mt-0.5 w-full rounded-lg border border-hair-strong bg-white px-2 py-1.5 tabular-nums text-[0.875rem] text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="flex-1 text-[0.8125rem] text-ink-3">
                Costo unit. (₡)
                <input
                  type="number"
                  inputMode="decimal"
                  value={r.cost}
                  onChange={(e) => set(i, { cost: e.target.value })}
                  className="mt-0.5 w-full rounded-lg border border-hair-strong bg-white px-2 py-1.5 tabular-nums text-[0.875rem] text-ink outline-none focus:border-brand"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[0.875rem]">
        <span className="text-ink-2">
          {valid.length} de {rows.length} líneas{skipped > 0 ? ` · ${skipped} omitida(s)` : ''}
        </span>
        <span className="tabular-nums font-semibold text-ink">{formatCRC(total)}</span>
      </div>

      {!canApply ? (
        <p className="mt-2 rounded-xl bg-warn-tint px-3 py-2 text-[0.8125rem] text-warn">Solo el dueño o el superadmin puede aplicar facturas al inventario.</p>
      ) : (
        <button
          onClick={submit}
          disabled={apply.isPending || valid.length === 0}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-2.5 text-[0.875rem] font-semibold text-white disabled:opacity-50"
        >
          {apply.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {apply.isPending ? 'Aplicando…' : `Confirmar y subir ${valid.length} producto(s) al inventario`}
        </button>
      )}
      {apply.isError && <p className="mt-2 text-[0.8125rem] text-danger">{(apply.error as Error).message}</p>}
    </div>
  )
}
