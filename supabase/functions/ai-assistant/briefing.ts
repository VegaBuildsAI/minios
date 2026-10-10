// MiniOS · «Mini», el compañero del Inicio: lee el estado real del abastecedor y lo
// cuenta en lenguaje natural. Una sola llamada al modelo, sin herramientas: el contexto
// se arma aquí con consultas acotadas (RLS del usuario), así es rápido y barato.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { addUsage, claude, crDayStartISO, HttpError, logUsage, type Usage } from '../_shared/ai.ts'

const MODEL = Deno.env.get('AI_MODEL_ASSISTANT') ?? 'claude-haiku-4-5'
const SCREENS = ['caja', 'inventario', 'proveedores', 'bitacora', 'ventas', 'reportes', 'asistente', 'alerta'] as const
const MOODS = ['happy', 'excited', 'worried', 'thinking', 'sleepy'] as const

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['mood', 'titulo', 'mensaje', 'ir_a', 'sugerencias'],
  properties: {
    mood: { type: 'string', enum: [...MOODS] },
    titulo: { type: 'string' },
    mensaje: { type: 'string' },
    ir_a: { type: 'string', enum: [...SCREENS] },
    sugerencias: { type: 'array', items: { type: 'string' } },
  },
}

const SYSTEM =
  'Sos «Mini», el compañero del Inicio de MiniOS en un abastecedor de Costa Rica. Hablás como una persona de confianza del negocio: ' +
  'cálido, natural, costarricense, con voseo; nunca robótico ni genérico. Recibís el ESTADO REAL del negocio y la hora local. ' +
  'Escribí el mensaje que el dueño ve al abrir la app: lo más importante AHORA y qué conviene hacer, según la hora del día ' +
  '(mañana: abrir turno, proveedor que viene; mediodía: ritmo de ventas; tarde: pedidos; noche: cuadre y cierre; madrugada: tranquilizar y mandar a descansar). ' +
  'No saludes (el saludo ya está en pantalla) ni repitas la hora. Usá SOLO los datos dados; no inventes cifras ni causas. Montos en colones con ₡. ' +
  'Sin emojis ni markdown. titulo: máx. 7 palabras. mensaje: máx. 32 palabras, una o dos frases. ' +
  'mood: worried si hay algo urgente (agotados, tiquetes sin registrar, faltante), excited si hay buenas noticias (meta cumplida, ventas arriba), ' +
  'thinking si hay algo por decidir, sleepy de madrugada sin urgencias, happy si todo está bien. ' +
  'ir_a: la pantalla donde se resuelve lo que decís. sugerencias: 3 preguntas cortas (máx. 6 palabras) que el usuario podría hacerte a continuación, concretas para este estado.'

const WEEKDAY = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const crc = (n: number) => '₡' + Math.round(n).toLocaleString('es-CR')
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export interface Briefing {
  mood: (typeof MOODS)[number]
  titulo: string
  mensaje: string
  ir_a: (typeof SCREENS)[number]
  sugerencias: string[]
}

/** Arma el estado del negocio (hora de Costa Rica) en líneas compactas. */
async function readState(db: SupabaseClient, userId: string, goal: number): Promise<string> {
  const cr = new Date(Date.now() - 6 * 3_600_000)
  const hhmm = `${cr.getUTCHours()}:${String(cr.getUTCMinutes()).padStart(2, '0')}`
  const dow = cr.getUTCDay()
  const today = crDayStartISO()
  const weekAgoStart = crDayStartISO(7)
  const weekAgoSameTime = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const [sales, salesLw, prods, sups, drafts, tickets, shift, cash, lastSale, profile, settings] = await Promise.all([
    db.rpc('ai_sales_summary', { p_from: today, p_to: new Date().toISOString() }),
    db.rpc('ai_sales_summary', { p_from: weekAgoStart, p_to: weekAgoSameTime }),
    db.from('products').select('name,stock_qty,min_qty,supplier_id').eq('is_active', true),
    db.from('suppliers').select('id,name,visit_days').eq('is_active', true),
    db.from('captures').select('id', { count: 'exact', head: true }).eq('status', 'borrador'),
    db.from('captures').select('id', { count: 'exact', head: true }).eq('status', 'borrador').eq('raw_input', 'Tiquete de caja'),
    db.from('shifts').select('id,opened_at,opening_cash').is('closed_at', null).order('opened_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('cash_movements').select('kind,amount').gte('created_at', today),
    db.from('sales').select('created_at,total').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('profiles').select('full_name,role').eq('id', userId).maybeSingle(),
    db.from('business_settings').select('name').eq('id', 1).maybeSingle(),
  ])

  const s = (sales.data ?? {}) as { ventas?: number; ganancia?: number; tickets?: number }
  const lw = (salesLw.data ?? {}) as { ventas?: number; tickets?: number }
  const products = (prods.data ?? []) as { name: string; stock_qty: number; min_qty: number; supplier_id: string | null }[]
  const out = products.filter((p) => Number(p.stock_qty) <= 0)
  const low = products.filter((p) => Number(p.stock_qty) > 0 && Number(p.stock_qty) <= Number(p.min_qty))
  const visiting = ((sups.data ?? []) as { id: string; name: string; visit_days: string[] }[]).filter((x) => (x.visit_days ?? []).some((d) => norm(d) === DAY_KEYS[dow]))
  const lowOf = (id: string) => products.filter((p) => p.supplier_id === id && Number(p.stock_qty) <= Number(p.min_qty)).length
  const outs = ((cash.data ?? []) as { kind: string; amount: number }[]).filter((m) => m.kind !== 'ingreso').reduce((a, m) => a + Number(m.amount), 0)
  const sh = shift.data as { id: string; opened_at: string; opening_cash: number } | null
  // Efectivo esperado del turno (aunque cruce la medianoche), igual que la pantalla Caja.
  let expected: number | null = null
  if (sh) {
    const [ss, cm] = await Promise.all([
      db.from('sales').select('total').eq('shift_id', sh.id).eq('payment_method', 'efectivo'),
      db.from('cash_movements').select('kind,amount').eq('shift_id', sh.id),
    ])
    expected =
      Number(sh.opening_cash) +
      ((ss.data ?? []) as { total: number }[]).reduce((a, r) => a + Number(r.total), 0) +
      ((cm.data ?? []) as { kind: string; amount: number }[]).reduce((a, m) => a + (m.kind === 'ingreso' ? 1 : -1) * Number(m.amount), 0)
  }
  const ls = lastSale.data as { created_at: string; total: number } | null
  const minsSinceSale = ls ? Math.round((Date.now() - new Date(ls.created_at).getTime()) / 60_000) : null
  const name = String((profile.data as { full_name?: string } | null)?.full_name ?? '').split(' ')[0] || 'el dueño'

  return [
    `Negocio: ${(settings.data as { name?: string } | null)?.name ?? 'abastecedor'}. Usuario: ${name}.`,
    `Hora local Costa Rica: ${WEEKDAY[dow]} ${hhmm}.`,
    `Ventas hoy: ${crc(s.ventas ?? 0)} en ${s.tickets ?? 0} tiquetes; ganancia ${crc(s.ganancia ?? 0)}. Meta diaria ${crc(goal)} (${goal ? Math.round(((s.ventas ?? 0) / goal) * 100) : 0} %).`,
    `Mismo ${WEEKDAY[dow]} de la semana pasada a esta hora: ${crc(lw.ventas ?? 0)} en ${lw.tickets ?? 0} tiquetes.`,
    `Última venta: ${minsSinceSale == null ? 'ninguna registrada' : minsSinceSale < 90 ? `hace ${minsSinceSale} min` : `hace ${Math.round(minsSinceSale / 60)} h`}.`,
    `Turno: ${sh ? `abierto desde ${new Date(new Date(sh.opened_at).getTime() - 6 * 3_600_000).toISOString().slice(0, 16).replace('T', ' ')} (apertura ${crc(sh.opening_cash)}); efectivo esperado en gaveta ahora ${crc(expected ?? 0)}` : 'no hay turno abierto'}. Salidas de efectivo hoy: ${crc(outs)}.`,
    `Agotados (${out.length}): ${out.slice(0, 5).map((p) => p.name).join(', ') || 'ninguno'}.`,
    `Bajo mínimo (${low.length}): ${low.slice(0, 5).map((p) => `${p.name} ${p.stock_qty}/${p.min_qty}`).join(', ') || 'ninguno'}.`,
    `Tiquetes fotografiados sin registrar: ${tickets.count ?? 0}. Entradas de Bitácora por revisar: ${Math.max(0, (drafts.count ?? 0) - (tickets.count ?? 0))}.`,
    `Proveedores que visitan hoy: ${visiting.map((v) => `${v.name} (${lowOf(v.id)} productos suyos bajo mínimo)`).join(', ') || 'ninguno'}.`,
  ].join('\n')
}

export async function briefing(db: SupabaseClient, admin: SupabaseClient, userId: string, goal: number): Promise<Briefing & { tokens: number }> {
  const state = await readState(db, userId, goal)
  let usage: Usage = { input_tokens: 0, output_tokens: 0 }
  try {
    // deno-lint-ignore no-explicit-any
    const res: any = await claude().messages.create({
      model: MODEL,
      max_tokens: 350,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: `ESTADO ACTUAL:\n${state}` }],
      // deno-lint-ignore no-explicit-any
    } as any)
    usage = addUsage(usage, res.usage)
    const text = res.content.find((b: { type: string }) => b.type === 'text')?.text
    if (!text) throw new HttpError(502, 'Mini no pudo leer la tienda.')
    const b = JSON.parse(text) as Briefing
    b.sugerencias = (b.sugerencias ?? []).filter((x) => typeof x === 'string' && x.trim()).slice(0, 3)
    if (!MOODS.includes(b.mood)) b.mood = 'happy'
    if (!SCREENS.includes(b.ir_a)) b.ir_a = 'asistente'
    return { ...b, tokens: usage.input_tokens + usage.output_tokens }
  } finally {
    if (usage.input_tokens > 0) await logUsage(admin, { userId, fn: 'assistant', model: MODEL, usage })
  }
}
