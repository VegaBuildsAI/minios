// MiniOS · mini-daily · carga de datos y armado de los «hechos» del día.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { dayKey, runMl, type ItemRow, type ProductRow, type SaleRow, type SupplierRow } from './ml.ts'

const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/** PostgREST devuelve como máximo 1000 filas por consulta: se pagina. */
// deno-lint-ignore no-explicit-any
async function fetchAll<T>(q: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error) throw error
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) return out
  }
}

export async function buildFacts(admin: SupabaseClient) {
  const now = Date.now()
  const today = dayKey(now)
  const since = new Date(Date.parse(`${today}T06:00:00Z`) - 56 * 86_400_000).toISOString()

  const [salesRaw, itemsRaw, prodRaw, supRaw, settings, pending, drafts, debt, shift] = await Promise.all([
    fetchAll<{ id: string; created_at: string; total: number; payment_method: string }>((a, b) =>
      admin.from('sales').select('id,created_at,total,payment_method').gte('created_at', since).order('created_at').range(a, b),
    ),
    fetchAll<{ sale_id: string; product_id: string; qty: number; unit_price: number }>((a, b) =>
      admin.from('sale_items').select('sale_id,product_id,qty,unit_price,sales!inner(created_at)').gte('sales.created_at', since).order('id').range(a, b),
    ),
    admin.from('products').select('id,name,stock_qty,min_qty,cost_price,sale_price,supplier_id').eq('is_active', true),
    admin.from('suppliers').select('id,name,visit_days').eq('is_active', true),
    admin.from('business_settings').select('name').eq('id', 1).maybeSingle(),
    admin.from('captures').select('id', { count: 'exact', head: true }).eq('status', 'borrador').eq('raw_input', 'Tiquete de caja'),
    admin.from('captures').select('id', { count: 'exact', head: true }).eq('status', 'borrador'),
    admin.from('customers').select('balance_debt'),
    admin.from('shifts').select('id').is('closed_at', null).limit(1).maybeSingle(),
  ])

  const sales: SaleRow[] = salesRaw.map((s) => ({ id: s.id, at: Date.parse(s.created_at), total: Number(s.total), method: s.payment_method }))
  const items: ItemRow[] = itemsRaw.filter((i) => i.product_id).map((i) => ({ sale: i.sale_id, product: i.product_id, qty: Number(i.qty), price: Number(i.unit_price) }))
  const products: ProductRow[] = ((prodRaw.data ?? []) as { id: string; name: string; stock_qty: number; min_qty: number; cost_price: number; sale_price: number; supplier_id: string | null }[]).map((p) => ({
    id: p.id,
    name: p.name,
    stock: Number(p.stock_qty),
    min: Number(p.min_qty),
    cost: Number(p.cost_price),
    price: Number(p.sale_price),
    supplier: p.supplier_id,
  }))
  const suppliers: SupplierRow[] = ((supRaw.data ?? []) as { id: string; name: string; visit_days: string[] }[]).map((s) => ({
    id: s.id,
    name: s.name,
    days: (s.visit_days ?? []).map((d) => DAY_KEYS.indexOf(norm(d))).filter((d) => d >= 0),
  }))

  const ml = runMl({ today, sales, items, products, suppliers })
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay()
  return {
    v: 1,
    day: today,
    label: `${WD[dow]} ${Number(today.slice(8))}`,
    business: (settings.data as { name?: string } | null)?.name ?? 'el abastecedor',
    pending: { tickets: pending.count ?? 0, bitacora: Math.max(0, (drafts.count ?? 0) - (pending.count ?? 0)) },
    fiado: Math.round(((debt.data ?? []) as { balance_debt: number }[]).reduce((a, r) => a + Number(r.balance_debt), 0)),
    shiftOpen: !!shift.data,
    visitingToday: suppliers.filter((s) => s.days.includes(dow)).map((s) => s.name),
    ...ml,
  }
}

export type Facts = Awaited<ReturnType<typeof buildFacts>>

/**
 * Lo que viaja a Claude: claves de 1–2 letras, top-N y enteros (pocos tokens).
 * La leyenda está en el prompt de sistema.
 */
export function compact(f: Facts) {
  return JSON.stringify({
    d: f.label,
    n: f.business,
    y: [f.sales.yesterday.rev, f.sales.yesterday.tix],
    s7: [f.sales.d7.rev, f.sales.d7.tix],
    tr: f.sales.trendPct,
    an: f.sales.anomalyZ,
    ex: f.sales.expectedToday,
    tk: f.sales.avgTicket,
    pk: `${f.sales.peak.from}-${f.sales.peak.to}`,
    r: f.risk.slice(0, 5).map((p) => [p.name, p.stock, p.daysLeft]),
    o: f.orders.slice(0, 3).map((o) => [o.supplier, o.lead, o.items.slice(0, 4).map((i) => [i.name, i.qty])]),
    tp: f.top.slice(0, 3).map((t) => [t.name, t.margin7]),
    pr: f.pairs.slice(0, 2).map((p) => [p.a, p.b]),
    pe: [f.pending.tickets, f.pending.bitacora],
    fi: f.fiado,
    sh: f.shiftOpen ? 1 : 0,
  })
}

export const SLOTS = ['mad', 'tem', 'man', 'med', 'tar', 'noc'] as const
export type Slot = (typeof SLOTS)[number]
export interface DayText {
  s: Record<Slot, [string, string]>
  c: string[]
  src: 'ia' | 'local'
}

const crc = (n: number) => '₡' + Math.round(n).toLocaleString('es-CR')

/** Redacción local, sin IA: se usa si la IA está apagada, sin presupuesto o falla. */
export function localText(f: Facts): DayText {
  const risk = f.risk[0]
  const order = f.orders[0]
  const orderTxt = order ? `${order.supplier} ${order.lead === 0 ? 'viene hoy' : `viene en ${order.lead} día(s)`}: pedí ${order.items.slice(0, 2).map((i) => `${i.qty} ${i.name}`).join(' y ')}.` : 'No hay pedidos urgentes.'
  const riskTxt = risk ? `${risk.name} alcanza para ${risk.daysLeft} día(s).` : 'Ningún producto está por agotarse.'
  const pend = f.pending.tickets ? `Tenés ${f.pending.tickets} tiquete(s) sin registrar.` : f.pending.bitacora ? `Hay ${f.pending.bitacora} entrada(s) de Bitácora por revisar.` : ''
  return {
    src: 'local',
    s: {
      mad: ['Todo quieto por ahora', `Ayer cerraste con ${crc(f.sales.yesterday.rev)} en ${f.sales.yesterday.tix} tiquetes. Descansá; mañana seguimos.`],
      tem: ['Listos para abrir', `${riskTxt} ${pend}`.trim()],
      man: ['Lo importante de la mañana', `${orderTxt} ${riskTxt}`],
      med: ['Ritmo del mediodía', `Vas en {v} con {t} tiquetes ({m} de la meta). La hora pico es de ${f.sales.peak.from} a ${f.sales.peak.to} h.`],
      tar: ['Buen momento para pedir', `${orderTxt} Un ${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date(`${f.day}T12:00:00Z`).getUTCDay()]} típico deja ${crc(f.sales.expectedToday)}.`],
      noc: ['Hora de cuadrar', `Hoy vas en {v} ({t} tiquetes). En gaveta deberían haber {e}. ${pend}`.trim()],
    },
    c: [
      riskTxt,
      orderTxt,
      f.top[0] ? `${f.top[0].name} es lo que más ganancia deja esta semana.` : 'Registrá tiquetes para ver la ganancia por producto.',
      f.pairs[0] ? `${f.pairs[0].a} y ${f.pairs[0].b} se venden juntos: ponelos cerca.` : 'Ordená la góndola por lo que más se vende.',
      `Tendencia: ${f.sales.trendPct >= 0 ? '+' : ''}${f.sales.trendPct} % frente a la semana anterior.`,
      f.fiado ? `Hay ${crc(f.fiado)} de fiado por cobrar.` : 'No hay fiado pendiente.',
    ],
  }
}
