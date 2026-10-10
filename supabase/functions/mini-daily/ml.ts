// MiniOS · mini-daily · motor determinístico (sin IA).
// Funciones puras sobre el historial de ventas en días de Costa Rica: mismo dato →
// mismo resultado. Modelos livianos y explicables, pensados para un abastecedor:
//  · pronóstico por producto: índice semanal (por día de la semana, con encogimiento)
//    × nivel por suavizado exponencial simple;
//  · días para agotarse, stock de seguridad (z·σ·√días) y cantidad sugerida a pedir
//    hasta la siguiente visita del proveedor;
//  · ABC por ganancia (Pareto 80/15/5), tendencia 7 d, anomalía de ayer (z-score contra
//    el mismo día de la semana), hora pico y pares que se compran juntos (soporte/lift).

export const OFFSET_MS = -6 * 3_600_000 // Costa Rica, UTC−6 fijo
const DAY_MS = 86_400_000

export const dayKey = (ms: number) => new Date(ms + OFFSET_MS).toISOString().slice(0, 10)
export const crHour = (ms: number) => new Date(ms + OFFSET_MS).getUTCHours()
export const crDow = (key: string) => new Date(`${key}T12:00:00Z`).getUTCDay()

export interface SaleRow {
  id: string
  at: number
  total: number
  method: string
}
export interface ItemRow {
  sale: string
  product: string
  qty: number
  price: number
}
export interface ProductRow {
  id: string
  name: string
  stock: number
  min: number
  cost: number
  price: number
  supplier: string | null
}
export interface SupplierRow {
  id: string
  name: string
  days: number[] // 0 = domingo
}

export interface ProductFacts {
  id: string
  name: string
  stock: number
  min: number
  abc: 'A' | 'B' | 'C'
  /** unidades esperadas hoy y en 7 días */
  fToday: number
  f7: number
  /** días hasta agotarse al ritmo pronosticado (null = no rota) */
  daysLeft: number | null
  /** unidades sugeridas a pedir en la próxima visita del proveedor */
  suggest: number
  margin7: number
  units7: number
  supplier: string | null
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0)
const std = (a: number[]) => {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - 1))
}
const r1 = (n: number) => Math.round(n * 10) / 10

/** Días calendario (CR) desde `from` hasta `to` inclusive. */
export function dayRange(fromKey: string, toKey: string): string[] {
  const out: string[] = []
  for (let t = Date.parse(`${fromKey}T00:00:00Z`); t <= Date.parse(`${toKey}T00:00:00Z`); t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10))
  return out
}

/** Índice semanal con encogimiento hacia 1 (k=2 pseudo-observaciones) para series cortas. */
function weekdayIndex(days: string[], y: number[]): number[] {
  const m = mean(y)
  if (m === 0) return [1, 1, 1, 1, 1, 1, 1]
  const s = [0, 0, 0, 0, 0, 0, 0]
  const n = [0, 0, 0, 0, 0, 0, 0]
  days.forEach((d, i) => {
    const w = crDow(d)
    s[w] += y[i] / m
    n[w]++
  })
  return s.map((v, w) => (v + 2) / (n[w] + 2))
}

/** Nivel por suavizado exponencial simple (α) sobre la serie desestacionalizada. */
function sesLevel(z: number[], alpha = 0.3): { level: number; resid: number[] } {
  let level = mean(z.slice(0, 7)) || 0
  const resid: number[] = []
  for (const v of z) {
    resid.push(v - level)
    level = alpha * v + (1 - alpha) * level
  }
  return { level, resid }
}

/** Días hasta la próxima visita (0 = hoy) y largo del ciclo hasta la siguiente. */
function visitWindow(sup: SupplierRow | undefined, todayDow: number): { lead: number; cycle: number } {
  if (!sup || !sup.days.length) return { lead: 3, cycle: 7 }
  const offs = sup.days.map((d) => (d - todayDow + 7) % 7).sort((a, b) => a - b)
  const lead = offs[0]
  const after = offs.find((o) => o > lead)
  return { lead, cycle: after != null ? after - lead : 7 }
}

export interface MlInput {
  today: string // AAAA-MM-DD (CR)
  sales: SaleRow[]
  items: ItemRow[]
  products: ProductRow[]
  suppliers: SupplierRow[]
}

export function runMl({ today, sales, items, products, suppliers }: MlInput) {
  // Historial hasta AYER (el día en curso está incompleto).
  const histDays = dayRange(dayKey(Date.parse(`${today}T06:00:00Z`) - 56 * DAY_MS), dayKey(Date.parse(`${today}T06:00:00Z`) - DAY_MS))
  const dayIdx = new Map(histDays.map((d, i) => [d, i]))
  const saleDay = new Map(sales.map((s) => [s.id, dayKey(s.at)]))
  const todayDow = crDow(today)
  const supById = new Map(suppliers.map((s) => [s.id, s]))

  // Series por producto (unidades y ganancia por día)
  const units = new Map<string, number[]>()
  const marginByProd = new Map<string, number[]>()
  const costOf = new Map(products.map((p) => [p.id, p.cost]))
  for (const it of items) {
    const d = saleDay.get(it.sale)
    const i = d != null ? dayIdx.get(d) : undefined
    if (i == null) continue
    if (!units.has(it.product)) {
      units.set(it.product, new Array(histDays.length).fill(0))
      marginByProd.set(it.product, new Array(histDays.length).fill(0))
    }
    units.get(it.product)![i] += it.qty
    marginByProd.get(it.product)![i] += it.qty * (it.price - (costOf.get(it.product) ?? 0))
  }

  const last7 = (a: number[]) => sum(a.slice(-7))
  const totalMargin = sum(products.map((p) => sum(marginByProd.get(p.id) ?? [])))

  // ABC por ganancia acumulada (Pareto)
  const ranked = [...products].sort((a, b) => sum(marginByProd.get(b.id) ?? []) - sum(marginByProd.get(a.id) ?? []))
  const abc = new Map<string, 'A' | 'B' | 'C'>()
  let acc = 0
  for (const p of ranked) {
    acc += sum(marginByProd.get(p.id) ?? [])
    const share = totalMargin > 0 ? acc / totalMargin : 1
    abc.set(p.id, share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C')
  }

  const pf: ProductFacts[] = products.map((p) => {
    const y = units.get(p.id) ?? new Array(histDays.length).fill(0)
    const w = weekdayIndex(histDays, y)
    const z = histDays.map((d, i) => y[i] / w[crDow(d)])
    const { level, resid } = sesLevel(z)
    const sigma = std(resid.slice(-28))
    const fDay = (k: number) => Math.max(0, level * w[(todayDow + k) % 7])
    const f7 = sum([0, 1, 2, 3, 4, 5, 6].map(fDay))
    const rate = f7 / 7
    const { lead, cycle } = visitWindow(supById.get(p.supplier ?? ''), todayDow)
    const horizon = lead + cycle
    const need = rate * horizon + 1.28 * sigma * Math.sqrt(horizon)
    const suggest = Math.max(0, Math.ceil(need + p.min - p.stock))
    return {
      id: p.id,
      name: p.name,
      stock: p.stock,
      min: p.min,
      abc: abc.get(p.id) ?? 'C',
      fToday: r1(fDay(0)),
      f7: r1(f7),
      daysLeft: rate > 0.05 ? r1(p.stock / rate) : null,
      suggest: rate > 0.05 ? suggest : 0,
      margin7: Math.round(last7(marginByProd.get(p.id) ?? [])),
      units7: last7(y),
      supplier: p.supplier,
    }
  })

  // Ventas por día (ingresos y tiquetes) para tendencia y anomalía
  const revDay = new Array(histDays.length).fill(0)
  const tixDay = new Array(histDays.length).fill(0)
  const hours = new Array(24).fill(0)
  for (const s of sales) {
    const i = dayIdx.get(dayKey(s.at))
    if (i == null) continue
    revDay[i] += s.total
    tixDay[i]++
    hours[crHour(s.at)]++
  }
  const y = revDay.length - 1
  const sameWd = histDays.map((d, i) => ({ d, i })).filter((x) => crDow(x.d) === crDow(histDays[y]) && x.i !== y).map((x) => revDay[x.i])
  const sd = std(sameWd)
  const anomalyZ = sd > 0 ? r1((revDay[y] - mean(sameWd)) / sd) : 0
  const rev7 = sum(revDay.slice(-7))
  const prev7 = sum(revDay.slice(-14, -7))

  // Hora pico: ventana de 2 horas con más tiquetes
  let peak = 0
  for (let h = 1; h < 23; h++) if (hours[h] + hours[h + 1] > hours[peak] + hours[peak + 1]) peak = h

  // Pares que se compran juntos (soporte ≥ 1 % de tiquetes, lift > 1.2)
  const baskets = new Map<string, Set<string>>()
  for (const it of items) {
    if (!saleDay.has(it.sale)) continue
    if (!baskets.has(it.sale)) baskets.set(it.sale, new Set())
    baskets.get(it.sale)!.add(it.product)
  }
  const nB = baskets.size || 1
  const single = new Map<string, number>()
  const pair = new Map<string, number>()
  for (const b of baskets.values()) {
    const arr = [...b].sort()
    for (const a of arr) single.set(a, (single.get(a) ?? 0) + 1)
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) pair.set(`${arr[i]}|${arr[j]}`, (pair.get(`${arr[i]}|${arr[j]}`) ?? 0) + 1)
  }
  const nameOf = new Map(products.map((p) => [p.id, p.name]))
  const pairs = [...pair.entries()]
    .filter(([, c]) => c / nB >= 0.01 && c >= 4)
    .map(([k, c]) => {
      const [a, b] = k.split('|')
      return { a: nameOf.get(a) ?? '?', b: nameOf.get(b) ?? '?', n: c, lift: r1((c / nB) / (((single.get(a) ?? 1) / nB) * ((single.get(b) ?? 1) / nB))) }
    })
    .filter((x) => x.lift > 1.2)
    .sort((x, y2) => y2.lift * y2.n - x.lift * x.n)
    .slice(0, 5)

  // Pedido sugerido por proveedor (en orden de visita)
  const orders = suppliers
    .map((s) => ({
      supplier: s.name,
      lead: visitWindow(s, todayDow).lead,
      items: pf.filter((p) => p.supplier === s.id && p.suggest > 0 && (p.daysLeft ?? 99) <= visitWindow(s, todayDow).lead + visitWindow(s, todayDow).cycle + 2).sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99)).map((p) => ({ name: p.name, qty: p.suggest })),
    }))
    .filter((o) => o.items.length)
    .sort((a, b) => a.lead - b.lead)

  return {
    histDays: histDays.length,
    sales: {
      yesterday: { rev: Math.round(revDay[y]), tix: tixDay[y] },
      d7: { rev: Math.round(rev7), tix: sum(tixDay.slice(-7)) },
      prev7: { rev: Math.round(prev7), tix: sum(tixDay.slice(-14, -7)) },
      trendPct: prev7 > 0 ? Math.round(((rev7 - prev7) / prev7) * 100) : 0,
      sameWeekdayAvg: Math.round(mean(sameWd)),
      anomalyZ,
      avgTicket: sum(tixDay) ? Math.round(sum(revDay) / sum(tixDay)) : 0,
      peak: { from: peak, to: peak + 2 },
      expectedToday: Math.round(mean(histDays.map((d, i) => ({ d, i })).filter((x) => crDow(x.d) === todayDow).map((x) => revDay[x.i]))),
    },
    products: pf,
    risk: pf.filter((p) => p.daysLeft != null && p.daysLeft <= 7).sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99)).slice(0, 8),
    top: [...pf].sort((a, b) => b.margin7 - a.margin7).slice(0, 5).map((p) => ({ name: p.name, margin7: p.margin7, units7: p.units7 })),
    orders,
    pairs,
  }
}

export type MlFacts = ReturnType<typeof runMl>
