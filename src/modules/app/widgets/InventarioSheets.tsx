import { useState, type ReactNode } from 'react'
import { Check, Loader2, Plus, Trash2, X } from 'lucide-react'
import { useCategories, useCreateProduct, useManualEntry, useProducts, useSuppliers } from '@/lib/data'
import { formatCRC } from '@/lib/types'

const field = 'w-full h-12 rounded-[14px] border border-hair-strong bg-white px-3.5 text-[0.9375rem] text-ink outline-none focus:border-brand'
const small = 'w-full rounded-xl border border-hair-strong bg-white px-3 py-2 tabular-nums text-[0.9375rem] text-ink outline-none focus:border-brand'

function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div className="mx-auto flex max-h-[92%] w-full max-w-[440px] flex-col rounded-t-[22px] bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-[1.125rem] font-bold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-3">{children}</div>
        <div className="border-t border-hair px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">{footer}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[0.8125rem] font-semibold text-ink-2">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

const UNITS = ['unidad', 'kg', 'litro', 'paquete', 'caja']

export function NewProductSheet({ onClose }: { onClose: () => void }) {
  const create = useCreateProduct()
  const { data: categories = [] } = useCategories()
  const { data: suppliers = [] } = useSuppliers()
  const [f, setF] = useState({ name: '', sku: '', categoryId: '', supplierId: '', unit: 'unidad', cost: '', price: '', min: '', qty: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  const price = Number(f.price)
  const cost = Number(f.cost) || 0
  const valid = f.name.trim().length > 1 && price > 0 && cost >= 0 && Number(f.min || 0) >= 0 && Number(f.qty || 0) >= 0
  const margin = price > 0 && cost > 0 ? Math.round(((price - cost) / price) * 100) : null

  const save = async () => {
    await create.mutateAsync({
      name: f.name,
      sku: f.sku,
      categoryId: f.categoryId || null,
      supplierId: f.supplierId || null,
      unit: f.unit,
      costPrice: cost,
      salePrice: price,
      minQty: Number(f.min) || 0,
      initialQty: Number(f.qty) || 0,
    })
    onClose()
  }

  return (
    <Sheet
      title="Nuevo producto"
      onClose={onClose}
      footer={
        <>
          <button onClick={save} disabled={!valid || create.isPending} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-50">
            {create.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {create.isPending ? 'Guardando…' : 'Crear producto'}
          </button>
          {create.isError && <p className="mt-2 text-center text-[0.875rem] text-danger">{(create.error as Error).message}</p>}
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nombre">
          <input value={f.name} onChange={set('name')} placeholder="Ej. Arroz Blanco 1kg" className={field} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Precio de venta (₡)">
            <input type="number" inputMode="decimal" value={f.price} onChange={set('price')} className={`${field} tabular-nums`} />
          </Field>
          <Field label="Costo (₡)">
            <input type="number" inputMode="decimal" value={f.cost} onChange={set('cost')} className={`${field} tabular-nums`} />
          </Field>
        </div>
        {margin !== null && <p className={`-mt-1 text-[0.8125rem] font-semibold ${margin < 0 ? 'text-danger' : 'text-ink-2'}`}>Margen {margin} %</p>}
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Stock inicial">
            <input type="number" inputMode="decimal" value={f.qty} onChange={set('qty')} placeholder="0" className={`${field} tabular-nums`} />
          </Field>
          <Field label="Mínimo">
            <input type="number" inputMode="decimal" value={f.min} onChange={set('min')} placeholder="0" className={`${field} tabular-nums`} />
          </Field>
        </div>
        <Field label="Categoría">
          <select value={f.categoryId} onChange={set('categoryId')} className={field}>
            <option value="">— Sin categoría —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Proveedor">
          <select value={f.supplierId} onChange={set('supplierId')} className={field}>
            <option value="">— Sin proveedor —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Unidad">
            <select value={f.unit} onChange={set('unit')} className={field}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Código (opcional)">
            <input value={f.sku} onChange={set('sku')} placeholder="SKU o barras" className={field} />
          </Field>
        </div>
      </div>
    </Sheet>
  )
}

interface Line {
  productId: string
  qty: string
  cost: string
}

export function ManualEntrySheet({ onClose }: { onClose: () => void }) {
  const entry = useManualEntry()
  const { data: products = [] } = useProducts()
  const { data: suppliers = [] } = useSuppliers()
  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState<Line[]>([{ productId: '', qty: '', cost: '' }])

  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const pick = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId)
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, productId, cost: l.cost || (p ? String(p.cost_price) : '') } : l)))
  }

  const ok = (l: Line) => l.productId && Number(l.qty) > 0 && l.cost !== '' && Number(l.cost) >= 0
  const valid = lines.length > 0 && lines.every(ok)
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.cost) || 0), 0)
  const units = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)

  const save = async () => {
    await entry.mutateAsync({
      supplierId: supplierId || null,
      lines: lines.map((l) => ({ product_id: l.productId, qty: Number(l.qty), cost: Number(l.cost) })),
    })
    onClose()
  }

  return (
    <Sheet
      title="Entrada de mercadería"
      onClose={onClose}
      footer={
        <>
          <div className="mb-2 flex justify-between text-[0.875rem] text-ink-2">
            <span>
              {lines.length} producto{lines.length === 1 ? '' : 's'} · {units} unidades
            </span>
            <span className="tabular-nums font-semibold text-ink">{formatCRC(total)}</span>
          </div>
          <button onClick={save} disabled={!valid || entry.isPending} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-50">
            {entry.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {entry.isPending ? 'Guardando…' : 'Subir al inventario'}
          </button>
          {!valid && <p className="mt-1.5 text-center text-[0.8125rem] text-ink-3">Cada línea necesita producto, cantidad y costo.</p>}
          {entry.isError && <p className="mt-2 text-center text-[0.875rem] text-danger">{(entry.error as Error).message}</p>}
        </>
      }
    >
      <p className="mb-3 text-[0.8125rem] text-ink-2">Para mercadería que llegó sin factura. Si tenés la factura, tomale foto en la Bitácora y la IA la lee.</p>
      <Field label="Proveedor (opcional)">
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={field}>
          <option value="">— Sin proveedor —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="mt-3 space-y-2.5">
        {lines.map((l, i) => (
          <div key={i} className="rounded-[18px] border border-hair bg-paper p-3">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={l.productId}
                onChange={(e) => pick(i, e.target.value)}
                aria-label={`Producto de la línea ${i + 1}`}
                className="min-w-0 flex-1 rounded-xl border border-hair-strong bg-white px-2.5 py-2 text-[0.9375rem] text-ink outline-none focus:border-brand"
              >
                <option value="">— Elegí el producto —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {lines.length > 1 && (
                <button
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  aria-label={`Quitar línea ${i + 1}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-tint"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <label className="flex-1 text-[0.8125rem] text-ink-3">
                Cantidad
                <input type="number" inputMode="decimal" value={l.qty} onChange={(e) => set(i, { qty: e.target.value })} className={`mt-0.5 ${small}`} />
              </label>
              <label className="flex-1 text-[0.8125rem] text-ink-3">
                Costo unit. (₡)
                <input type="number" inputMode="decimal" value={l.cost} onChange={(e) => set(i, { cost: e.target.value })} className={`mt-0.5 ${small}`} />
              </label>
            </div>
          </div>
        ))}
        <button
          onClick={() => setLines((ls) => [...ls, { productId: '', qty: '', cost: '' }])}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-hair-strong text-[0.875rem] font-semibold text-ink-2"
        >
          <Plus size={16} /> Agregar producto
        </button>
      </div>
    </Sheet>
  )
}
