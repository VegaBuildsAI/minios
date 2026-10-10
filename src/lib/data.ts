import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { type CaptureCategory, type CaptureStatus, type CaptureType, type CashKind, type CashMovement, type Category, type MovementReason, type PaymentMethod, type Product, type PurchaseItem, type PurchaseOrder, type Sale, type Shift, type StockMovement, type Supplier, type Capture, type Proposal } from './types'
import { crDayKey, crParts, crStartOfDay, DAY_MS } from './time'

/** 00:00 de hoy en Costa Rica (no en la zona del dispositivo). */
function startOfToday(): string {
  return crStartOfDay().toISOString()
}

// ---------- Queries ----------
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Product[]
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order')
      if (error) throw error
      return data as Category[]
    },
  })
}

export interface DashboardStats {
  salesTodayTotal: number
  salesTodayCount: number
  criticalCount: number
  fiadoTotal: number
  /** Clientes con saldo de fiado > 0. */
  fiadoClients: number
  productsCount: number
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [salesRes, productsRes, customersRes] = await Promise.all([
        supabase.from('sales').select('total').gte('created_at', startOfToday()),
        supabase.from('products').select('stock_qty, min_qty').eq('is_active', true),
        supabase.from('customers').select('balance_debt'),
      ])
      if (salesRes.error) throw salesRes.error
      if (productsRes.error) throw productsRes.error
      const sales = (salesRes.data ?? []) as { total: number }[]
      const products = (productsRes.data ?? []) as { stock_qty: number; min_qty: number }[]
      const customers = (customersRes.data ?? []) as { balance_debt: number }[]
      return {
        salesTodayTotal: sales.reduce((s, r) => s + Number(r.total), 0),
        salesTodayCount: sales.length,
        criticalCount: products.filter((p) => Number(p.stock_qty) <= Number(p.min_qty)).length,
        fiadoTotal: customers.reduce((s, r) => s + Number(r.balance_debt), 0),
        fiadoClients: customers.filter((r) => Number(r.balance_debt) > 0).length,
        productsCount: products.length,
      }
    },
  })
}

export interface SaleRow extends Sale {
  itemCount: number
}

export function useTodaySales() {
  return useQuery({
    queryKey: ['sales', 'today'],
    queryFn: async (): Promise<SaleRow[]> => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, sale_items(count)')
        .gte('created_at', startOfToday())
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((s): SaleRow => {
        const items = (s.sale_items as { count: number }[] | null) ?? []
        return { ...(s as Sale), itemCount: items[0]?.count ?? 0 }
      })
    },
  })
}

export function useStockMovements(productId: string | null) {
  return useQuery({
    queryKey: ['movements', productId],
    enabled: !!productId,
    queryFn: async (): Promise<StockMovement[]> => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId as string)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as StockMovement[]
    },
  })
}

export function useOpenShift() {
  return useQuery({
    queryKey: ['shift', 'open'],
    queryFn: async (): Promise<Shift | null> => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as Shift) ?? null
    },
  })
}

// ---------- Mutations ----------
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** Movimientos de inventario de hoy agrupados por razón (cantidad de movimientos y unidades). */
export function useTodayMovementsSummary() {
  return useQuery({
    queryKey: ['movements', 'today-summary'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Partial<Record<MovementReason, { count: number; units: number }>>> => {
      const { data, error } = await supabase.from('stock_movements').select('reason, delta').gte('created_at', startOfToday()).limit(5000)
      if (error) throw error
      const out: Partial<Record<MovementReason, { count: number; units: number }>> = {}
      for (const m of (data ?? []) as { reason: MovementReason; delta: number }[]) {
        const r = (out[m.reason] ??= { count: 0, units: 0 })
        r.count++
        r.units += Math.abs(Number(m.delta))
      }
      return out
    },
  })
}

export type ActivityKind = 'venta' | 'tiquete' | 'inventario' | 'bitacora' | 'orden' | 'turno' | 'efectivo'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  at: string
  title: string
  module: string
  by: string | null
}

const MOVE_LABEL: Record<MovementReason, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  entrada: 'Entrada',
  merma: 'Merma',
  robo: 'Robo',
  vencimiento: 'Vencimiento',
  ajuste: 'Ajuste',
}
const CASH_LABEL: Record<CashKind, string> = { ingreso: 'Entrada de efectivo', pago_proveedor: 'Pago a proveedor', gasto: 'Gasto', retiro: 'Retiro del dueño' }
const PAY_LABEL: Record<PaymentMethod, string> = { efectivo: 'Efectivo', sinpe: 'SINPE', tarjeta: 'Tarjeta', fiado: 'Fiado' }
const crc = (n: number) => '₡' + Math.round(n).toLocaleString('es-CR')

type SaleAct = { id: string; total: number; payment_method: PaymentMethod; capture_id: string | null; ticket_number: string | null; staff_id: string | null; created_at: string }
type MoveAct = { id: string; delta: number; reason: MovementReason; created_by: string | null; created_at: string; products: { name: string } | null }
type CapAct = { id: string; type: CaptureType; raw_input: string | null; file_name: string | null; created_by: string | null; created_at: string }
type PoAct = { id: string; status: string; total: number; created_at: string; suppliers: { name: string } | null }
type ShiftAct = { id: string; opening_cash: number; opened_at: string; closed_at: string | null; staff_id: string | null }
type CashAct = { id: string; kind: CashKind; amount: number; note: string | null; created_by: string | null; created_at: string }

/**
 * Feed del Panel de Control: los últimos registros de cada módulo, en paralelo, unidos
 * y ordenados por fecha. Las bajas por venta las crea el trigger de inventario, así que
 * de stock_movements se omiten las de razón `sale` (ya aparecen como tiquete).
 */
export function useRecentActivity(limit = 8) {
  return useQuery({
    queryKey: ['activity', limit],
    refetchInterval: 60_000,
    queryFn: async (): Promise<ActivityItem[]> => {
      const n = limit
      const [sales, moves, caps, pos, shifts, cash, profs] = await Promise.all([
        supabase.from('sales').select('id, total, payment_method, capture_id, ticket_number, staff_id, created_at').order('created_at', { ascending: false }).limit(n),
        supabase.from('stock_movements').select('id, delta, reason, created_by, created_at, products(name)').neq('reason', 'sale').order('created_at', { ascending: false }).limit(n),
        supabase.from('captures').select('id, type, raw_input, file_name, created_by, created_at').order('created_at', { ascending: false }).limit(n),
        supabase.from('purchase_orders').select('id, status, total, created_at, suppliers(name)').order('created_at', { ascending: false }).limit(n),
        supabase.from('shifts').select('id, opening_cash, closed_at, opened_at, staff_id').order('opened_at', { ascending: false }).limit(n),
        supabase.from('cash_movements').select('id, kind, amount, note, created_by, created_at').order('created_at', { ascending: false }).limit(n),
        supabase.from('profiles').select('id, full_name'),
      ])
      for (const r of [sales, moves, caps, pos, shifts, cash]) if (r.error) throw r.error
      const who = new Map(((profs.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name || null]))
      const by = (id: string | null) => (id ? (who.get(id) ?? null) : null)
      const items: ActivityItem[] = []

      for (const s of (sales.data ?? []) as SaleAct[]) {
        const t = s.capture_id ? 'Tiquete' : 'Venta'
        items.push({
          id: `s-${s.id}`,
          kind: s.capture_id ? 'tiquete' : 'venta',
          at: s.created_at,
          title: `${t}${s.ticket_number ? ` N.° ${s.ticket_number}` : ''} ${crc(Number(s.total))} · ${PAY_LABEL[s.payment_method]}`,
          module: 'Caja',
          by: by(s.staff_id),
        })
      }
      for (const m of (moves.data ?? []) as unknown as MoveAct[]) {
        const d = Number(m.delta)
        items.push({ id: `m-${m.id}`, kind: 'inventario', at: m.created_at, title: `${MOVE_LABEL[m.reason]} ${d > 0 ? '+' : ''}${d} · ${m.products?.name ?? 'producto'}`, module: 'Inventario', by: by(m.created_by) })
      }
      for (const c of (caps.data ?? []) as CapAct[]) {
        const what = c.type === 'voice' ? 'Nota de voz' : c.type === 'text' ? 'Nota' : c.raw_input === 'Tiquete de caja' ? 'Foto de tiquete' : (c.file_name ?? 'Archivo')
        items.push({ id: `c-${c.id}`, kind: 'bitacora', at: c.created_at, title: what, module: 'Bitácora', by: by(c.created_by) })
      }
      for (const o of (pos.data ?? []) as unknown as PoAct[]) {
        items.push({ id: `o-${o.id}`, kind: 'orden', at: o.created_at, title: `Orden ${o.status} ${crc(Number(o.total))}${o.suppliers ? ` · ${o.suppliers.name}` : ''}`, module: 'Proveedores', by: null })
      }
      for (const t of (shifts.data ?? []) as ShiftAct[]) {
        items.push({ id: `t-${t.id}`, kind: 'turno', at: t.opened_at, title: `Turno abierto · ${crc(Number(t.opening_cash))}`, module: 'Caja', by: by(t.staff_id) })
        if (t.closed_at) items.push({ id: `tc-${t.id}`, kind: 'turno', at: t.closed_at, title: 'Turno cerrado', module: 'Caja', by: by(t.staff_id) })
      }
      for (const m of (cash.data ?? []) as CashAct[]) {
        items.push({ id: `e-${m.id}`, kind: 'efectivo', at: m.created_at, title: `${CASH_LABEL[m.kind]} ${crc(Number(m.amount))}${m.note ? ` · ${m.note}` : ''}`, module: 'Caja', by: by(m.created_by) })
      }
      return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
    },
  })
}

export interface ShiftCash {
  /** Tiquetes cobrados en efectivo dentro del turno. */
  cashSales: number
  /** Entradas de efectivo que no son ventas (fondo, etc.). */
  ins: number
  /** Gastos, pagos a proveedor y retiros. */
  outs: number
  /** apertura + cashSales + ins − outs */
  expected: number
}

/**
 * Cuadre del turno abierto. Se calcula por `shift_id` (no por «hoy») para que un turno
 * que cruza la medianoche siga sumando lo que pasó antes de las 00:00.
 */
export function useShiftCash(shift: Shift | null | undefined) {
  return useQuery({
    queryKey: ['shift-cash', shift?.id ?? null],
    enabled: !!shift,
    queryFn: async (): Promise<ShiftCash> => {
      const s = shift as Shift
      const [salesRes, cashRes] = await Promise.all([
        supabase.from('sales').select('total').eq('shift_id', s.id).eq('payment_method', 'efectivo'),
        supabase.from('cash_movements').select('kind, amount').eq('shift_id', s.id),
      ])
      if (salesRes.error) throw salesRes.error
      if (cashRes.error) throw cashRes.error
      const cashSales = ((salesRes.data ?? []) as { total: number }[]).reduce((a, r) => a + Number(r.total), 0)
      let ins = 0
      let outs = 0
      for (const m of (cashRes.data ?? []) as { kind: CashKind; amount: number }[]) {
        if (m.kind === 'ingreso') ins += Number(m.amount)
        else outs += Number(m.amount)
      }
      return { cashSales, ins, outs, expected: Number(s.opening_cash) + cashSales + ins - outs }
    },
  })
}

/** Entradas y salidas de efectivo de hoy (las que no son ventas). */
export function useTodayCashMovements() {
  return useQuery({
    queryKey: ['cash_movements', 'today'],
    queryFn: async (): Promise<CashMovement[]> => {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .gte('created_at', startOfToday())
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CashMovement[]
    },
  })
}

export function useAddCashMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: { kind: CashKind; amount: number; note: string; supplierId: string | null; shiftId: string | null }) => {
      const created_by = await currentUserId()
      const { error } = await supabase.from('cash_movements').insert({
        kind: m.kind,
        amount: m.amount,
        note: m.note.trim() || null,
        supplier_id: m.supplierId,
        shift_id: m.shiftId,
        created_by,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash_movements'] })
      qc.invalidateQueries({ queryKey: ['shift-cash'] })
    },
  })
}

export interface TicketLine {
  product_id: string
  qty: number
  price: number
}

/**
 * Registra un tiquete de la registradora como venta: todo o nada en la base
 * (`register_ticket`). Cada línea ya viene enrutada a un producto; el trigger de
 * sale_items baja el inventario.
 */
export function useRegisterTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: {
      captureId: string | null
      shiftId: string | null
      payment: PaymentMethod
      number: string
      total: number
      tax: number
      lines: TicketLine[]
    }) => {
      const { data, error } = await supabase.rpc('register_ticket', {
        p_capture: t.captureId,
        p_shift: t.shiftId,
        p_payment: t.payment,
        p_number: t.number,
        p_total: t.total,
        p_tax: t.tax,
        p_lines: t.lines,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['captures'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['shift-cash'] })
    },
  })
}

export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ productId, delta, reason }: { productId: string; delta: number; reason: MovementReason }) => {
      const created_by = await currentUserId()
      const { error } = await supabase
        .from('stock_movements')
        .insert({ product_id: productId, delta, reason, created_by })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
    },
  })
}

export interface NewProductInput {
  name: string
  sku: string
  categoryId: string | null
  supplierId: string | null
  unit: string
  costPrice: number
  salePrice: number
  minQty: number
  initialQty: number
}

/** Crea un producto (owner+). El stock inicial entra como movimiento "entrada" para que quede en el historial. */
export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: NewProductInput) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: p.name.trim(),
          sku: p.sku.trim() || null,
          category_id: p.categoryId,
          supplier_id: p.supplierId,
          unit: p.unit,
          cost_price: p.costPrice,
          sale_price: p.salePrice,
          min_qty: p.minQty,
          stock_qty: 0,
        })
        .select('id')
        .single()
      if (error) throw error.code === '23505' ? new Error('Ya existe un producto con ese código.') : error
      if (p.initialQty > 0) {
        const { error: mErr } = await supabase
          .from('stock_movements')
          .insert({ product_id: data.id, delta: p.initialQty, reason: 'entrada', created_by: await currentUserId() })
        if (mErr) throw mErr
      }
      return data.id as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

/**
 * Entrada de mercadería sin factura: varios productos con cantidad y costo. Usa la misma
 * función que aplica facturas (`apply_invoice`, sin foto): crea la compra recibida y sube
 * el inventario en una sola transacción.
 */
export function useManualEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ supplierId, lines }: { supplierId: string | null; lines: { product_id: string; qty: number; cost: number }[] }) => {
      const { data, error } = await supabase.rpc('apply_invoice', { p_capture: null, p_supplier: supplierId, p_lines: lines })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['purchase_orders'] })
    },
  })
}

export function useOpenShiftMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ openingCash }: { openingCash: number }) => {
      const staff_id = await currentUserId()
      const { error } = await supabase.from('shifts').insert({ staff_id, opening_cash: openingCash })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift'] }),
  })
}

export function useCloseShiftMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ shiftId, closingCash }: { shiftId: string; closingCash: number }) => {
      const { data: sales, error: sErr } = await supabase.from('sales').select('total').eq('shift_id', shiftId)
      if (sErr) throw sErr
      const total_sales = ((sales ?? []) as { total: number }[]).reduce((s, r) => s + Number(r.total), 0)
      const { error } = await supabase
        .from('shifts')
        .update({ closed_at: new Date().toISOString(), closing_cash: closingCash, total_sales })
        .eq('id', shiftId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift'] })
      qc.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

// ---------- Proveedores & Compras (M3) ----------
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase.from('suppliers').select('*').eq('is_active', true).order('name')
      if (error) throw error
      return data as Supplier[]
    },
  })
}

export function usePurchaseOrders(supplierId?: string) {
  return useQuery({
    queryKey: ['purchase_orders', supplierId ?? 'all'],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      let q = supabase.from('purchase_orders').select('*').order('created_at', { ascending: false })
      if (supplierId) q = q.eq('supplier_id', supplierId)
      const { data, error } = await q
      if (error) throw error
      return data as PurchaseOrder[]
    },
  })
}

export interface POItemRow extends PurchaseItem {
  product: Pick<Product, 'id' | 'name' | 'unit'> | null
}

export function usePOItems(poId: string | null) {
  return useQuery({
    queryKey: ['po_items', poId],
    enabled: !!poId,
    queryFn: async (): Promise<POItemRow[]> => {
      const { data, error } = await supabase
        .from('purchase_items')
        .select('*, product:products(id, name, unit)')
        .eq('po_id', poId as string)
      if (error) throw error
      return data as unknown as POItemRow[]
    },
  })
}

/** Genera una orden de compra sugerida para un proveedor con sus productos bajo mínimo. */
export function useCreateSuggestedPO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ supplierId }: { supplierId: string }): Promise<{ poId: string; lines: number }> => {
      const { data: prods, error: pErr } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
      if (pErr) throw pErr
      const low = (prods as Product[]).filter((p) => Number(p.stock_qty) <= Number(p.min_qty))
      if (low.length === 0) return { poId: '', lines: 0 }

      const items = low.map((p) => {
        const qty = Math.max(Math.ceil(Number(p.min_qty) * 2 - Number(p.stock_qty)), 1)
        return { product: p, qty }
      })
      const total = items.reduce((s, it) => s + it.product.cost_price * it.qty, 0)

      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({ supplier_id: supplierId, status: 'borrador', total })
        .select()
        .single()
      if (poErr) throw poErr

      const rows = items.map((it) => ({
        po_id: (po as PurchaseOrder).id,
        product_id: it.product.id,
        qty_ordered: it.qty,
        qty_received: 0,
        unit_cost: it.product.cost_price,
      }))
      const { error: iErr } = await supabase.from('purchase_items').insert(rows)
      if (iErr) throw iErr
      return { poId: (po as PurchaseOrder).id, lines: rows.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_orders'] })
    },
  })
}

/** Recibe una orden: registra entradas de stock (trigger sube stock) y marca recibida. */
export function useReceivePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ poId }: { poId: string }) => {
      const { data: items, error: iErr } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('po_id', poId)
      if (iErr) throw iErr
      const created_by = await currentUserId()
      const movements = (items as PurchaseItem[])
        .filter((it) => it.product_id)
        .map((it) => ({
          product_id: it.product_id as string,
          delta: Number(it.qty_ordered),
          reason: 'purchase' as MovementReason,
          reference_id: poId,
          created_by,
        }))
      if (movements.length > 0) {
        const { error: mErr } = await supabase.from('stock_movements').insert(movements)
        if (mErr) throw mErr
      }
      // Marca qty_received = qty_ordered en cada línea
      for (const it of items as PurchaseItem[]) {
        await supabase.from('purchase_items').update({ qty_received: it.qty_ordered }).eq('id', it.id)
      }
      const { error: uErr } = await supabase
        .from('purchase_orders')
        .update({ status: 'recibida', received_at: new Date().toISOString() })
        .eq('id', poId)
      if (uErr) throw uErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_orders'] })
      qc.invalidateQueries({ queryKey: ['po_items'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

// ---------- Bitácora (M4) ----------
export function useCaptures() {
  return useQuery({
    queryKey: ['captures'],
    // Mientras la IA lee un documento, se refresca sola hasta que termine.
    refetchInterval: (q) => (q.state.data?.some((c) => c.ai_status === 'procesando') ? 3000 : false),
    queryFn: async (): Promise<Capture[]> => {
      const { data, error } = await supabase
        .from('captures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Capture[]
    },
  })
}

// Debe coincidir con file_size_limit / allowed_mime_types del bucket (migración 0005).
export const BITACORA_MAX_BYTES = 10 * 1024 * 1024
export const BITACORA_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
const BITACORA_MIMES = BITACORA_ACCEPT.split(',')

export interface UploadedFile {
  path: string
  name: string
  mime: string
  size: number
}

/**
 * Las fotos de celular pesan 3–8 MB; se reducen a ≤2000 px en JPEG (cientos de KB)
 * para que el 1 GB del plan alcance para miles de documentos. 2000 px (y no menos)
 * conserva la letra pequeña de facturas largas para leerlas luego (OCR/IA).
 * Los PDF no se tocan. Si no se puede decodificar o no baja de tamaño, se sube el original.
 */
async function compressImage(file: File, maxDim = 2000, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff' // PNG con transparencia → fondo blanco (JPEG no tiene alfa)
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/** Sube un archivo al bucket privado y devuelve su ruta + metadatos (no hay URL pública). */
export async function uploadBitacoraFile(original: File): Promise<UploadedFile> {
  if (!BITACORA_MIMES.includes(original.type)) {
    throw new Error(`"${original.name}": tipo no permitido. Usá JPG, PNG, WebP o PDF.`)
  }
  const file = await compressImage(original)
  if (file.size > BITACORA_MAX_BYTES) {
    throw new Error(`"${original.name}" pesa ${(file.size / 1048576).toFixed(1)} MB; el máximo es 10 MB.`)
  }
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const folder = crDayKey().slice(0, 7)
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('bitacora').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return { path, name: original.name, mime: file.type, size: file.size }
}

/** URL firmada temporal (1 h) para ver/abrir un archivo del bucket privado. */
export function useSignedUrl(path: string | null) {
  return useQuery({
    queryKey: ['signed-url', path],
    enabled: !!path,
    staleTime: 50 * 60_000, // se renueva antes de que venza
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage.from('bitacora').createSignedUrl(path as string, 3600)
      if (error) throw error
      return data.signedUrl
    },
  })
}

export function useCreateCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      type,
      rawInput,
      category = 'notas',
      file,
    }: {
      type: CaptureType
      rawInput: string
      category?: CaptureCategory
      file?: UploadedFile
    }) => {
      const created_by = await currentUserId()
      const { data, error } = await supabase
        .from('captures')
        .insert({
          type,
          category,
          raw_input: rawInput,
          status: 'borrador',
          created_by,
          file_path: file?.path ?? null,
          file_name: file?.name ?? null,
          file_mime: file?.mime ?? null,
          file_size: file?.size ?? null,
        })
        .select('id')
        .single()
      if (error) {
        // El registro no se creó: no dejar el archivo huérfano en el bucket.
        if (file) await supabase.storage.from('bitacora').remove([file.path])
        throw error
      }
      return data.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captures'] }),
  })
}

/** Borra la entrada y su archivo (solo owner+; lo imponen las políticas RLS). */
export function useDeleteCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Pick<Capture, 'id' | 'file_path'>) => {
      const { error } = await supabase.from('captures').delete().eq('id', c.id)
      if (error) throw error
      if (c.file_path) await supabase.storage.from('bitacora').remove([c.file_path])
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captures'] }),
  })
}

export function useUpdateCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, rawInput, status, category }: { id: string; rawInput?: string; status?: string; category?: CaptureCategory }) => {
      const patch: Record<string, unknown> = {}
      if (rawInput !== undefined) patch.raw_input = rawInput
      if (category !== undefined) patch.category = category
      if (status !== undefined) {
        patch.status = status
        if (status === 'procesado') patch.confirmed_at = new Date().toISOString()
      }
      const { error } = await supabase.from('captures').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captures'] }),
  })
}

export interface CaptureStats {
  byStatus: Record<CaptureStatus, number>
  byType: Record<CaptureType, number>
  /** Entradas de los últimos 30 días. */
  total: number
  /** Borradores (de cualquier fecha) con más de 24 h sin confirmar. */
  staleDrafts: number
  recent: Capture[]
}

/** Monitor de Bitácora: conteos por estado/tipo (30 días), borradores atrasados y últimas entradas. */
export function useCaptureStats() {
  return useQuery({
    // Cuelga de ['captures'] → create/update lo invalidan automáticamente.
    queryKey: ['captures', 'stats'],
    queryFn: async (): Promise<CaptureStats> => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
      const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
      const [rowsRes, staleRes, recentRes] = await Promise.all([
        supabase.from('captures').select('status, type').gte('created_at', since).limit(1000),
        supabase
          .from('captures')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'borrador')
          .lt('created_at', dayAgo),
        supabase.from('captures').select('*').order('created_at', { ascending: false }).limit(4),
      ])
      if (rowsRes.error) throw rowsRes.error
      if (recentRes.error) throw recentRes.error

      const byStatus: Record<CaptureStatus, number> = { borrador: 0, procesado: 0, archivado: 0 }
      const byType: Record<CaptureType, number> = { text: 0, voice: 0, photo: 0, file: 0 }
      const rows = (rowsRes.data ?? []) as { status: CaptureStatus; type: CaptureType }[]
      for (const r of rows) {
        if (r.status in byStatus) byStatus[r.status]++
        if (r.type in byType) byType[r.type]++
      }
      return {
        byStatus,
        byType,
        total: rows.length,
        staleDrafts: staleRes.count ?? 0,
        recent: (recentRes.data ?? []) as Capture[],
      }
    },
  })
}

// ---------- Reportes (M5) ----------
export interface TopProduct { productId: string; name: string; qty: number; revenue: number; margin: number; marginPct: number }
export interface DayPoint { day: string; total: number }

/** Granularidad de la tendencia: por hora (período de 1 día) o por día. */
export type TrendGranularity = 'hour' | 'day'
export interface TrendPoint { key: string; label: string; ventas: number; ganancia: number; tickets: number }

const pad2 = (n: number) => String(n).padStart(2, '0')
/** Clave de día en hora de Costa Rica (las ventas de la noche no caen al día siguiente UTC). */
export function localDayKey(d: Date): string {
  return crDayKey(d)
}
/** Clave de bucket: día, o día + hora (Costa Rica). */
const bucketKey = (d: Date, gran: TrendGranularity) => (gran === 'hour' ? `${crDayKey(d)} ${pad2(crParts(d).hour)}` : crDayKey(d))

/** Buckets rellenos en cero para ver el período completo (incluidos los huecos sin ventas). */
function emptyTrend(fromISO: string, toISO: string, gran: TrendGranularity): TrendPoint[] {
  const start = new Date(fromISO)
  const end = new Date(toISO)
  const out: TrendPoint[] = []
  if (gran === 'hour') {
    const base = localDayKey(start)
    for (let h = 0; h < 24; h++) out.push({ key: `${base} ${pad2(h)}`, label: `${h}h`, ventas: 0, ganancia: 0, tickets: 0 })
  } else {
    // Costa Rica no tiene horario de verano: cada día dura exactamente 24 h.
    for (let t = crStartOfDay(start).getTime(); t <= end.getTime(); t += DAY_MS) {
      const d = new Date(t)
      out.push({ key: crDayKey(d), label: pad2(crParts(d).day), ventas: 0, ganancia: 0, tickets: 0 })
    }
  }
  return out
}

export interface SalesReport {
  revenue: number
  cost: number
  margin: number
  marginPct: number
  ticketCount: number
  avgTicket: number
  byDay: DayPoint[]
  trend: TrendPoint[]
  topByQty: TopProduct[]
  topByMargin: TopProduct[]
  byMethod: Record<string, number>
  fiadoTotal: number
  /** Ganancia por producto y por bucket de la tendencia (clave = TrendPoint.key). */
  marginByProductBucket: Record<string, Record<string, number>>
}

export function useSalesReport(fromISO: string, toISO: string, granularity: TrendGranularity = 'day') {
  return useQuery({
    queryKey: ['report', fromISO, toISO, granularity],
    // Al cambiar de período se conserva el gráfico anterior (atenuado) en vez de parpadear.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SalesReport> => {
      const [salesRes, itemsRes, custRes] = await Promise.all([
        supabase.from('sales').select('total, payment_method, created_at').gte('created_at', fromISO).lte('created_at', toISO),
        supabase
          .from('sale_items')
          .select('qty, unit_price, products(id, name, cost_price), sales!inner(created_at)')
          .gte('sales.created_at', fromISO)
          .lte('sales.created_at', toISO),
        supabase.from('customers').select('balance_debt'),
      ])
      if (salesRes.error) throw salesRes.error
      if (itemsRes.error) throw itemsRes.error

      const sales = (salesRes.data ?? []) as { total: number; payment_method: string; created_at: string }[]
      type ItemRow = { qty: number; unit_price: number; products: { id: string; name: string; cost_price: number } | null; sales: { created_at: string } | null }
      const items = (itemsRes.data ?? []) as unknown as ItemRow[]
      const customers = (custRes.data ?? []) as { balance_debt: number }[]

      const byProd: Record<string, TopProduct> = {}
      const marginByProductBucket: Record<string, Record<string, number>> = {}
      const trend = emptyTrend(fromISO, toISO, granularity)
      const trendIndex = new Map(trend.map((t) => [t.key, t]))
      let revenue = 0
      let cost = 0
      for (const it of items) {
        const rev = Number(it.qty) * Number(it.unit_price)
        const c = Number(it.qty) * Number(it.products?.cost_price ?? 0)
        revenue += rev
        cost += c
        const pid = it.products?.id ?? it.products?.name ?? '—'
        if (it.sales?.created_at) {
          const key = bucketKey(new Date(it.sales.created_at), granularity)
          const bucket = trendIndex.get(key)
          if (bucket) {
            bucket.ventas += rev
            bucket.ganancia += rev - c
          }
          const pm = (marginByProductBucket[pid] ??= {})
          pm[key] = (pm[key] ?? 0) + rev - c
        }
        const name = it.products?.name ?? '—'
        byProd[pid] ??= { productId: pid, name, qty: 0, revenue: 0, margin: 0, marginPct: 0 }
        byProd[pid].qty += Number(it.qty)
        byProd[pid].revenue += rev
        byProd[pid].margin += rev - c
      }
      for (const p of Object.values(byProd)) p.marginPct = p.revenue > 0 ? (p.margin / p.revenue) * 100 : 0

      const byDayMap: Record<string, number> = {}
      const byMethod: Record<string, number> = {}
      for (const s of sales) {
        const day = localDayKey(new Date(s.created_at))
        byDayMap[day] = (byDayMap[day] ?? 0) + Number(s.total)
        byMethod[s.payment_method] = (byMethod[s.payment_method] ?? 0) + Number(s.total)
        const bucket = trendIndex.get(bucketKey(new Date(s.created_at), granularity))
        if (bucket) bucket.tickets++
      }

      const prods = Object.values(byProd)
      const margin = revenue - cost
      return {
        revenue,
        cost,
        margin,
        marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
        ticketCount: sales.length,
        avgTicket: sales.length ? sales.reduce((a, s) => a + Number(s.total), 0) / sales.length : 0,
        byDay: Object.entries(byDayMap).map(([day, total]) => ({ day, total })).sort((a, b) => a.day.localeCompare(b.day)),
        trend,
        topByQty: [...prods].sort((a, b) => b.qty - a.qty).slice(0, 10),
        topByMargin: [...prods].sort((a, b) => b.margin - a.margin).slice(0, 10),
        byMethod,
        fiadoTotal: customers.reduce((s, r) => s + Number(r.balance_debt), 0),
        marginByProductBucket,
      }
    },
  })
}

// ---------- Configuración (M6) ----------
export interface BusinessSettings {
  id: number
  name: string
  address: string | null
  phone: string | null
  tax_rate: number
  currency: 'CRC' | 'USD'
  logo_url: string | null
  /** Interruptor de la capa de IA y tope de gasto diario (USD). */
  ai_enabled: boolean
  ai_daily_budget_usd: number
}

export function useBusinessSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<BusinessSettings> => {
      const { data, error } = await supabase.from('business_settings').select('*').eq('id', 1).single()
      if (error) throw error
      return data as BusinessSettings
    },
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<BusinessSettings>) => {
      const { error } = await supabase.from('business_settings').update(patch).eq('id', 1)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

export interface ProfileRow { id: string; full_name: string; role: string; is_active: boolean }

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, role, is_active').order('full_name')
      if (error) throw error
      return data as ProfileRow[]
    },
  })
}

export function useUpdateProfileRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

// ---------- Capa de IA ----------
/** Llama a una Edge Function de IA y devuelve el mensaje de error útil (presupuesto, saldo, etc.). */
async function invokeFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let msg = 'No se pudo contactar a la IA.'
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const j = await ctx.json()
        if (j?.error) msg = String(j.error)
      } catch {
        /* cuerpo no JSON */
      }
    }
    throw new Error(msg)
  }
  return data as T
}

/** Lee un archivo de la Bitácora con IA (transcripción + datos). `force` ignora el caché por hash. */
export function useParseCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      invokeFn<{ ok: boolean; reused: boolean; tokens: number; cost_usd: number }>('ai-capture-parse', { capture_id: id, force: !!force }),
    onMutate: ({ id }) => {
      // Se ve "leyendo…" al instante, sin esperar al servidor.
      qc.setQueryData<Capture[]>(['captures'], (old) => old?.map((c) => (c.id === id ? { ...c, ai_status: 'procesando', ai_error: null } : c)))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['captures'] })
      qc.invalidateQueries({ queryKey: ['ai-usage'] })
    },
  })
}

export interface AssistantReply {
  reply: string
  proposals: Proposal[]
  tokens: number
}

export type PlaybookSlot = 'mad' | 'tem' | 'man' | 'med' | 'tar' | 'noc'

/** Hechos del día que calcula mini-daily en el servidor (determinístico + ML). Solo lo que usa la app. */
export interface PlaybookFacts {
  day: string
  label: string
  pending: { tickets: number; bitacora: number }
  fiado: number
  visitingToday: string[]
  sales: {
    yesterday: { rev: number; tix: number }
    d7: { rev: number; tix: number }
    prev7: { rev: number; tix: number }
    trendPct: number
    sameWeekdayAvg: number
    anomalyZ: number
    avgTicket: number
    peak: { from: number; to: number }
    expectedToday: number
  }
  products: { id: string; name: string; stock: number; min: number; abc: 'A' | 'B' | 'C'; fToday: number; f7: number; daysLeft: number | null; suggest: number; margin7: number; units7: number }[]
  risk: PlaybookFacts['products']
  top: { name: string; margin7: number; units7: number }[]
  orders: { supplier: string; lead: number; items: { name: string; qty: number }[] }[]
  pairs: { a: string; b: string; n: number; lift: number }[]
}

export interface MiniPlaybook {
  day: string
  status: 'pendiente' | 'enviado' | 'listo' | 'sin_ia' | 'error'
  facts: PlaybookFacts | null
  text: { s: Record<PlaybookSlot, [string, string]>; c: string[]; src: 'ia' | 'local' } | null
  model: string | null
  tokens: number
  cost_usd: number
  generated_at: string
}

/** Plan de hoy de «Mini» (lo genera mini-daily a las 9:00 CR). Leerlo no llama a la IA. */
export function useMiniPlaybook() {
  return useQuery({
    queryKey: ['mini-playbook', crDayKey()],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<MiniPlaybook | null> => {
      const { data, error } = await supabase.from('mini_playbook').select('*').eq('day', crDayKey()).maybeSingle()
      if (error) throw error
      return (data as MiniPlaybook) ?? null
    },
  })
}

/** Regenera el plan de hoy ya mismo (una llamada directa; solo dueño o superadmin). */
export function useRegenerateMini() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => invokeFn<{ status: string; cost_usd?: number; tokens?: number }>('mini-daily', { step: 'now' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mini-playbook'] })
      qc.invalidateQueries({ queryKey: ['ai-usage'] })
    },
  })
}

/** Pregunta al asistente. El cliente envía solo los últimos turnos de texto (menos tokens). */
export function askAssistant(messages: { role: 'user' | 'assistant'; content: string }[]) {
  return invokeFn<AssistantReply>('ai-assistant', { messages })
}

type SimpleProposal = Exclude<Proposal, { kind: 'receive_invoice' }>

/** Aplica una propuesta ya confirmada por el usuario (ajuste de inventario u orden de compra). */
export function useApplyProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: SimpleProposal) => {
      if (p.kind === 'stock_adjust') {
        const { error } = await supabase
          .from('stock_movements')
          .insert({ product_id: p.producto_id, delta: p.delta, reason: p.razon, created_by: await currentUserId() })
        if (error) throw error
      } else {
        const { error } = await supabase.rpc('create_purchase_order', {
          p_supplier: p.proveedor_id,
          p_items: p.items.map((i) => ({ product_id: i.producto_id, qty: i.cantidad, cost: i.costo })),
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['purchase_orders'] })
    },
  })
}

export interface InvoiceLineApply {
  product_id: string
  qty: number
  cost: number
}

/** Aplica una factura leída al inventario en una sola transacción (RPC apply_invoice). */
export function useApplyInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ captureId, supplierName, lines }: { captureId: string; supplierName: string | null; lines: InvoiceLineApply[] }) => {
      let supplierId: string | null = null
      if (supplierName) {
        const { data: sups } = await supabase.from('suppliers').select('id,name')
        const n = normText(supplierName)
        supplierId = (sups ?? []).find((s) => normText(s.name) === n || normText(s.name).includes(n) || n.includes(normText(s.name)))?.id ?? null
      }
      const { data, error } = await supabase.rpc('apply_invoice', { p_capture: captureId, p_supplier: supplierId, p_lines: lines })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['captures'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['purchase_orders'] })
    },
  })
}

/** Gasto de IA de hoy en USD (visible para cualquier sesión; solo el total). */
export function useAiSpendToday() {
  return useQuery({
    queryKey: ['ai-usage', 'today'],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('ai_spend_today')
      if (error) throw error
      return Number(data ?? 0)
    },
  })
}

export interface AiUsageSummary {
  total: number
  calls: number
  tokens: number
  byFn: Record<string, { cost: number; calls: number }>
}

/** Gasto de los últimos 30 días (solo dueño/superadmin; para otros roles RLS devuelve vacío). */
export function useAiUsageSummary() {
  return useQuery({
    queryKey: ['ai-usage', '30d'],
    queryFn: async (): Promise<AiUsageSummary> => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
      const { data, error } = await supabase
        .from('ai_usage')
        .select('fn, cost_usd, input_tokens, output_tokens')
        .gte('created_at', since)
        .limit(10000)
      if (error) throw error
      const out: AiUsageSummary = { total: 0, calls: 0, tokens: 0, byFn: {} }
      for (const r of (data ?? []) as { fn: string; cost_usd: number; input_tokens: number; output_tokens: number }[]) {
        out.total += Number(r.cost_usd)
        out.calls++
        out.tokens += r.input_tokens + r.output_tokens
        out.byFn[r.fn] ??= { cost: 0, calls: 0 }
        out.byFn[r.fn].cost += Number(r.cost_usd)
        out.byFn[r.fn].calls++
      }
      return out
    },
  })
}

function normText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
