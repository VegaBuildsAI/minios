/**
 * «Mini» responde sin IA: detecta la intención de la pregunta por palabras clave y arma
 * la respuesta con datos de la app (en vivo) y del plan del día (pronósticos de
 * mini-daily). Mismo dato → misma respuesta. Lo que no reconoce, lo dice y sugiere
 * preguntas que sí sabe responder.
 */
import type { Mood } from '../companion'
import type { PlaybookFacts } from '../data'
import { matchProduct } from '../match'
import { formatCRC, type Product, type Supplier } from '../types'
import { DAYS, DAY_LABEL, visitsOn } from '../visits'

export interface MiniContext {
  goal: number
  dow: number
  salesToday: number
  ticketsToday: number
  critical: number
  fiado: number
  products: Product[]
  suppliers: Supplier[]
  shiftOpen: boolean
  expectedCash: number | null
  pendingTickets: number
  bitacora: number
  facts: PlaybookFacts | null
  tips: string[]
}

export interface MiniAnswer {
  text: string
  mood: Mood
  to: string
}

export const SUGGESTED = ['¿Cómo van las ventas?', '¿Qué pido hoy?', '¿Qué se está agotando?', '¿Cuánto hay en la gaveta?', '¿A qué hora vendo más?', 'Dame un consejo']

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const has = (q: string, words: string[]) => words.some((w) => q.includes(w))
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const days = (n: number | null) => (n == null ? 'sin ventas recientes' : n < 1 ? 'menos de un día' : `${Math.round(n)} ${Math.round(n) === 1 ? 'día' : 'días'}`)

/** Producto mencionado en la pregunta (si hay uno claro). */
function productIn(q: string, products: Product[]): Product | null {
  const stop = /\b(cuanto|cuantos|cuantas|hay|de|del|la|el|los|las|queda|quedan|stock|inventario|se|acaba|agota|cuando|voy|a|vender|vendo|tengo|me|pronostico|para)\b/g
  const rest = q.replace(stop, ' ').replace(/\s+/g, ' ').trim()
  if (!rest) return null
  const m = matchProduct(rest, products)
  if (m.product) return m.product
  // Coincidencia por palabra (p. ej. «arroz» → «Arroz Blanco 1kg») si es única.
  const hits = products.filter((p) => rest.split(' ').some((w) => w.length > 3 && norm(p.name).includes(w)))
  return hits.length === 1 ? hits[0] : null
}

function nextVisit(s: Supplier, dow: number): number | null {
  for (let k = 0; k < 7; k++) if (visitsOn(s, DAYS[(dow + k) % 7])) return k
  return null
}

export function answer(question: string, c: MiniContext): MiniAnswer {
  const q = norm(question)
  const f = c.facts
  const pct = c.goal ? Math.round((c.salesToday / c.goal) * 100) : 0
  const prod = productIn(q, c.products)
  const pf = prod && f ? f.products.find((p) => p.id === prod.id) : undefined

  if (!q) return { text: '¿Qué querés saber? Puedo contarte ventas, pedidos, inventario, caja y proveedores.', mood: 'happy', to: '/app/assistant' }

  if (has(q, ['gracias', 'genial', 'perfecto', 'buenisimo', 'tuanis'])) return { text: '¡Con gusto! Aquí estoy cuando me necesités.', mood: 'excited', to: '/app' }
  if (/^(hola|buenas|buenos|hey|que tal)\b/.test(q) && q.split(' ').length <= 3) return { text: '¡Hola! Preguntame por ventas, qué pedir, qué se agota o cómo va la caja.', mood: 'happy', to: '/app' }

  // Producto específico: cuándo se acaba / cuánto voy a vender / cuánto hay
  if (prod && has(q, ['acaba', 'agota', 'alcanza', 'dura'])) {
    return {
      text: pf ? `${prod.name}: quedan ${prod.stock_qty} y al ritmo de venta alcanza para ${days(pf.daysLeft)}. ${pf.suggest ? `Sugiero pedir ${pf.suggest}.` : 'Por ahora no hace falta pedir.'}` : `${prod.name}: quedan ${prod.stock_qty} (mínimo ${prod.min_qty}).`,
      mood: pf && pf.daysLeft != null && pf.daysLeft <= 3 ? 'worried' : 'happy',
      to: '/app/inventario',
    }
  }
  if (prod && has(q, ['vender', 'vendo', 'pronostico', 'espero', 'saldra'])) {
    return {
      text: pf ? `${prod.name}: hoy espero vender unas ${pf.fToday} y en 7 días unas ${pf.f7}. Es categoría ${pf.abc} por ganancia.` : `Todavía no tengo historial suficiente de ${prod.name}.`,
      mood: 'thinking',
      to: '/app/inventario',
    }
  }
  if (prod) {
    return {
      text: `${prod.name}: hay ${prod.stock_qty} (mínimo ${prod.min_qty}), precio ${formatCRC(prod.sale_price)}.${pf && pf.daysLeft != null ? ` Alcanza para ${days(pf.daysLeft)}.` : ''}`,
      mood: prod.stock_qty <= prod.min_qty ? 'worried' : 'happy',
      to: '/app/inventario',
    }
  }

  if (has(q, ['ayer'])) {
    return f
      ? { text: `Ayer vendiste ${formatCRC(f.sales.yesterday.rev)} en ${plural(f.sales.yesterday.tix, 'tiquete', 'tiquetes')}.${Math.abs(f.sales.anomalyZ) >= 1.5 ? ` Fue un día ${f.sales.anomalyZ > 0 ? 'mejor' : 'más flojo'} de lo normal para ese día.` : ''}`, mood: 'happy', to: '/app/ventas' }
      : { text: 'Todavía no tengo el resumen de ayer.', mood: 'thinking', to: '/app/ventas' }
  }
  if (has(q, ['semana', '7 dias', 'siete dias'])) {
    return f
      ? { text: `Últimos 7 días: ${formatCRC(f.sales.d7.rev)} en ${plural(f.sales.d7.tix, 'tiquete', 'tiquetes')}, ${f.sales.trendPct >= 0 ? '+' : ''}${f.sales.trendPct} % frente a la semana anterior.`, mood: f.sales.trendPct >= 0 ? 'excited' : 'thinking', to: '/app/ventas' }
      : { text: 'Todavía no tengo el resumen de la semana.', mood: 'thinking', to: '/app/ventas' }
  }
  if (has(q, ['ganancia', 'deja mas', 'rentable', 'margen', 'mejor producto', 'top'])) {
    return f?.top.length
      ? { text: `Lo que más ganancia dejó esta semana: ${f.top.slice(0, 3).map((t) => `${t.name} (${formatCRC(t.margin7)})`).join(', ')}.`, mood: 'excited', to: '/app/ventas' }
      : { text: 'Todavía no hay ventas suficientes para ver la ganancia por producto.', mood: 'thinking', to: '/app/ventas' }
  }
  if (has(q, ['vend', 'venta', 'como vamos', 'como va', 'meta', 'facturado'])) {
    const exp = f?.sales.expectedToday
    return {
      text: `Hoy llevás ${formatCRC(c.salesToday)} en ${plural(c.ticketsToday, 'tiquete', 'tiquetes')} (${pct} % de la meta de ${formatCRC(c.goal)}).${exp ? ` Un ${DAY_LABEL[DAYS[c.dow]].toLowerCase()} típico deja ${formatCRC(exp)}.` : ''}`,
      mood: pct >= 100 ? 'excited' : 'happy',
      to: '/app/ventas',
    }
  }
  if (has(q, ['pedir', 'pedido', 'orden', 'comprar', 'reponer', 'surtir'])) {
    if (!f?.orders.length) return { text: 'Por ahora no hay nada urgente que pedir según el ritmo de ventas.', mood: 'happy', to: '/app/proveedores' }
    const o = f.orders.slice(0, 2).map((x) => `${x.supplier} (${x.lead === 0 ? 'hoy' : x.lead === 1 ? 'mañana' : `en ${x.lead} días`}): ${x.items.slice(0, 3).map((i) => `${i.qty} ${i.name}`).join(', ')}`)
    return { text: `Sugiero pedir: ${o.join('. ')}.`, mood: 'thinking', to: '/app/proveedores' }
  }
  if (has(q, ['agota', 'acaba', 'falta', 'critico', 'bajo', 'se termina'])) {
    if (f?.risk.length) return { text: `Lo que se acaba primero: ${f.risk.slice(0, 3).map((p) => `${p.name} (${days(p.daysLeft)})`).join(', ')}.`, mood: 'worried', to: '/app/inventario' }
    return { text: c.critical ? `Hay ${plural(c.critical, 'producto', 'productos')} en o bajo el mínimo.` : 'Nada se está por agotar. Inventario al día.', mood: c.critical ? 'worried' : 'happy', to: '/app/inventario' }
  }
  if (has(q, ['gaveta', 'efectivo', 'plata', 'caja', 'cuadre', 'turno'])) {
    return c.shiftOpen
      ? { text: `En la gaveta debería haber ${formatCRC(c.expectedCash ?? 0)} (apertura + tiquetes en efectivo + entradas − salidas del turno).`, mood: 'happy', to: '/app/caja' }
      : { text: 'No hay turno abierto. Abrilo en Caja para llevar el cuadre del efectivo.', mood: 'thinking', to: '/app/caja' }
  }
  if (has(q, ['proveedor', 'visita', 'viene', 'llega', 'distribuidor'])) {
    const today = c.suppliers.filter((s) => visitsOn(s, DAYS[c.dow]))
    const next = c.suppliers
      .map((s) => ({ s, k: nextVisit(s, (c.dow + 1) % 7) }))
      .filter((x) => x.k != null)
      .sort((a, b) => (a.k ?? 9) - (b.k ?? 9))[0]
    return {
      text: today.length ? `Hoy visita ${today.map((s) => s.name).join(' y ')}.` : `Hoy no viene nadie.${next ? ` El próximo es ${next.s.name} ${next.k === 0 ? 'mañana' : `en ${(next.k ?? 0) + 1} días`}.` : ''}`,
      mood: 'happy',
      to: '/app/proveedores',
    }
  }
  if (has(q, ['fiado', 'deben', 'cobrar', 'credito'])) return { text: c.fiado ? `Hay ${formatCRC(c.fiado)} de fiado por cobrar.` : 'No hay fiado pendiente.', mood: c.fiado ? 'thinking' : 'happy', to: '/app/ventas' }
  if (has(q, ['pendiente', 'bitacora', 'revisar', 'sin registrar'])) {
    const parts = [c.pendingTickets ? plural(c.pendingTickets, 'tiquete sin registrar', 'tiquetes sin registrar') : '', c.bitacora ? plural(c.bitacora, 'entrada de Bitácora por revisar', 'entradas de Bitácora por revisar') : ''].filter(Boolean)
    return parts.length ? { text: `Tenés ${parts.join(' y ')}.`, mood: 'worried', to: c.pendingTickets ? '/app/caja' : '/app/bitacora' } : { text: 'No hay nada pendiente. ¡Todo al día!', mood: 'excited', to: '/app' }
  }
  if (has(q, ['hora', 'pico', 'cuando vendo', 'mas gente'])) {
    return f ? { text: `La hora pico es de ${f.sales.peak.from} a ${f.sales.peak.to} h. El tiquete promedio es de ${formatCRC(f.sales.avgTicket)}.`, mood: 'happy', to: '/app/ventas' } : { text: 'Todavía no tengo suficientes ventas para saber la hora pico.', mood: 'thinking', to: '/app/ventas' }
  }
  if (has(q, ['junto', 'combo', 'acompan', 'par'])) {
    return f?.pairs.length ? { text: `Se compran juntos: ${f.pairs.slice(0, 2).map((p) => `${p.a} con ${p.b}`).join('; ')}. Ponelos cerca en la góndola.`, mood: 'excited', to: '/app/inventario' } : { text: 'Todavía no veo combinaciones claras en las compras.', mood: 'thinking', to: '/app/inventario' }
  }
  if (has(q, ['consejo', 'tip', 'recomienda', 'sugerencia', 'que hago'])) {
    const tip = c.tips.length ? c.tips[Math.floor(Date.now() / 60_000) % c.tips.length] : null
    return { text: tip ?? 'Registrá los tiquetes del día para que pueda darte mejores consejos.', mood: 'happy', to: '/app' }
  }

  return { text: `Todavía no sé responder eso sin conexión. Probá: «${SUGGESTED[1]}», «${SUGGESTED[2]}» o «¿Cuánto hay de arroz?». Para algo más abierto, abrí el chat con IA.`, mood: 'thinking', to: '/app/assistant' }
}
