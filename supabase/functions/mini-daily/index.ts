// MiniOS · Edge Function: mini-daily
// «Mini» consulta la IA UNA vez al día. Todo lo demás es determinístico:
//  1. facts.ts + ml.ts calculan el estado del abastecedor y los pronósticos (sin IA).
//  2. Una sola llamada a Claude Haiku redacta los textos del día (por franja horaria) a
//     partir de un resumen compacto. Va por Message Batches (−50 %): se envía a las 8:00
//     y se recoge a las 9:00 (hora de Costa Rica); si el lote no terminó, llamada directa.
//  3. Todo queda en `mini_playbook`; el Inicio lo lee y responde sin llamar a la API.
// Ahorro de tokens: entrada ~400 tokens (claves cortas, top-N), salida con schema JSON
// acotado, sin razonamiento (thinking apagado), max_tokens bajo, count_tokens (gratis).
// Pasos: submit (cron 8:00) · collect (cron 9:00) · now (botón «Regenerar», owner+).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { addUsage, claude, DEFAULT_MODEL, guard, handle, HttpError, json, logUsage, NO_THINKING, requireUser, type Usage } from '../_shared/ai.ts'
import { buildFacts, compact, localText, SLOTS, type DayText, type Facts } from './facts.ts'

const MODEL = Deno.env.get('AI_MODEL_MINI') ?? DEFAULT_MODEL
const MAX_OUT = 900

const pair = { type: 'array', items: { type: 'string' } }
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...SLOTS, 'c'],
  properties: { ...Object.fromEntries(SLOTS.map((s) => [s, pair])), c: { type: 'array', items: { type: 'string' } } },
}

const SYSTEM =
  'Sos «Mini», compañero del Inicio de MiniOS en un abastecedor de Costa Rica. Voseo, cálido y natural; sin emojis ni markdown. ' +
  'Recibís JSON del estado de hoy. Leyenda: d=día; n=negocio; y=[ventas ayer ₡, tiquetes]; s7=[ventas 7 días ₡, tiquetes]; tr=% vs 7 días previos; ' +
  'an=z de ayer vs mismo día de semana (|z|>1.5 es raro); ex=venta típica de este día ₡; tk=tiquete promedio ₡; pk=hora pico; ' +
  'r=[producto, stock, días para agotarse]; o=[proveedor, días hasta su visita (0=hoy), [[producto, cantidad sugerida]]]; ' +
  'tp=[producto, ganancia 7 días ₡]; pr=pares que se compran juntos; pe=[tiquetes sin registrar, Bitácora por revisar]; fi=fiado ₡; sh=turno abierto 1/0 (0 solo significa que aún no se abrió el turno, NO que la tienda esté cerrada). ' +
  'Para cada franja escribí [título ≤6 palabras, mensaje ≤28 palabras] con lo más útil en ese momento: ' +
  'mad (0–5 h, tranquilizar), tem (5–7 h, abrir), man (7–11:30, reponer y proveedor), med (11:30–13:30, ritmo de ventas), tar (13:30–18:30, pedidos), noc (18:30–24 h, cuadre y cierre). ' +
  'No saludes. Usá solo estos datos; para cifras del momento podés escribir {v} (ventas de hoy), {t} (tiquetes de hoy), {m} (% de la meta) y {e} (efectivo en gaveta). ' +
  'c: 6 consejos concretos, ≤16 palabras cada uno. Montos con ₡.'

function params(f: Facts) {
  return {
    model: MODEL,
    max_tokens: MAX_OUT,
    thinking: NO_THINKING,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: compact(f) }],
  }
}

/** Valida la salida de Claude; lo que falte se completa con la redacción local. */
// deno-lint-ignore no-explicit-any
function parseText(raw: string | undefined, f: Facts): DayText | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const local = localText(f)
    const s = Object.fromEntries(
      SLOTS.map((k) => {
        const v = o[k]
        return [k, Array.isArray(v) && v.length >= 2 && v.every((x) => typeof x === 'string' && x.trim()) ? [String(v[0]), String(v[1])] : local.s[k]]
      }),
    ) as DayText['s']
    const c = Array.isArray(o.c) ? (o.c as unknown[]).filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 6) : []
    return { s, c: c.length ? c : local.c, src: 'ia' }
  } catch {
    return null
  }
}

async function aiAllowed(admin: SupabaseClient, userId: string | null): Promise<string | null> {
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return 'Falta ANTHROPIC_API_KEY'
  try {
    await guard(admin, userId, 'mini-daily')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'IA no disponible'
  }
}

/** Llamada directa (sin lote): para «Regenerar» o si el lote no terminó a tiempo. */
async function direct(admin: SupabaseClient, f: Facts, userId: string | null) {
  // deno-lint-ignore no-explicit-any
  const p: any = params(f)
  const client = claude()
  const counted = await client.messages.countTokens({ model: p.model, system: p.system, messages: p.messages } as never).catch(() => null)
  // deno-lint-ignore no-explicit-any
  const res: any = await client.messages.create(p)
  const usage: Usage = addUsage({ input_tokens: 0, output_tokens: 0 }, res.usage)
  const cost = await logUsage(admin, { userId, fn: 'mini-daily', model: MODEL, usage })
  if (res.stop_reason === 'refusal') return { text: null, usage, cost, counted: counted?.input_tokens ?? null }
  const raw = res.content.find((b: { type: string }) => b.type === 'text')?.text
  return { text: parseText(raw, f), usage, cost, counted: counted?.input_tokens ?? null }
}

async function save(admin: SupabaseClient, row: Record<string, unknown>) {
  const { error } = await admin.from('mini_playbook').upsert({ ...row, generated_at: new Date().toISOString() }, { onConflict: 'day' })
  if (error) throw new HttpError(500, `No se pudo guardar el plan: ${error.message}`)
}

Deno.serve(
  handle(async (req) => {
    const body = await req.json().catch(() => ({}))
    const step: 'submit' | 'collect' | 'now' = ['submit', 'collect', 'now'].includes(body?.step) ? body.step : 'now'
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

    // Auth: el cron trae el secreto; una persona necesita ser dueño o superadmin.
    let userId: string | null = null
    const secret = Deno.env.get('MINI_CRON_SECRET')
    const fromCron = !!secret && req.headers.get('x-cron-secret') === secret
    if (!fromCron) {
      const { user, db } = await requireUser(req)
      const { data: prof } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (prof?.role !== 'owner' && prof?.role !== 'superadmin') throw new HttpError(403, 'Solo el dueño o el superadmin puede regenerar el plan de Mini.')
      userId = user.id
    }

    const facts = await buildFacts(admin)
    const day = facts.day
    const blocked = await aiAllowed(admin, userId)

    // Sin IA: el día queda con la redacción local (Mini nunca queda mudo).
    if (blocked) {
      await save(admin, { day, status: 'sin_ia', facts, text: localText(facts), model: null, tokens: 0, cost_usd: 0, batch_id: null, error: blocked })
      return json({ day, status: 'sin_ia', reason: blocked })
    }

    if (step === 'submit') {
      const batch = await claude().messages.batches.create({ requests: [{ custom_id: day, params: params(facts) as never }] })
      await save(admin, { day, status: 'enviado', facts, text: localText(facts), model: MODEL, batch_id: batch.id, error: null })
      return json({ day, status: 'enviado', batch: batch.id })
    }

    if (step === 'collect') {
      const { data: row } = await admin.from('mini_playbook').select('status,batch_id').eq('day', day).maybeSingle()
      if (row?.status === 'listo') return json({ day, status: 'listo', note: 'ya estaba listo' })
      if (row?.batch_id) {
        const client = claude()
        const b = await client.messages.batches.retrieve(row.batch_id)
        if (b.processing_status === 'ended') {
          for await (const r of await client.messages.batches.results(row.batch_id)) {
            if (r.custom_id !== day || r.result.type !== 'succeeded') continue
            // deno-lint-ignore no-explicit-any
            const msg: any = r.result.message
            const usage: Usage = addUsage({ input_tokens: 0, output_tokens: 0 }, msg.usage)
            const cost = await logUsage(admin, { userId: null, fn: 'mini-daily', model: MODEL, usage, batch: true })
            const raw = msg.content.find((x: { type: string }) => x.type === 'text')?.text
            const text = parseText(raw, facts)
            if (text) {
              await save(admin, { day, status: 'listo', facts, text, model: MODEL, tokens: usage.input_tokens + usage.output_tokens, cost_usd: Number(cost.toFixed(6)), error: null })
              return json({ day, status: 'listo', via: 'batch', tokens: usage.input_tokens + usage.output_tokens, cost_usd: cost })
            }
          }
        } else {
          // No terminó a tiempo: se cancela (para no pagar dos veces) y se llama directo.
          await client.messages.batches.cancel(row.batch_id).catch(() => null)
        }
      }
    }

    // now · collect sin lote utilizable → llamada directa
    try {
      const r = await direct(admin, facts, userId)
      const text = r.text ?? localText(facts)
      await save(admin, {
        day,
        status: r.text ? 'listo' : 'sin_ia',
        facts,
        text,
        model: MODEL,
        tokens: r.usage.input_tokens + r.usage.output_tokens,
        cost_usd: Number(r.cost.toFixed(6)),
        error: r.text ? null : 'La IA no devolvió un texto válido; se usó la redacción local.',
      })
      return json({ day, status: r.text ? 'listo' : 'sin_ia', via: 'directo', input_counted: r.counted, tokens: r.usage.input_tokens + r.usage.output_tokens, cost_usd: r.cost })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de IA'
      await save(admin, { day, status: 'error', facts, text: localText(facts), model: MODEL, error: msg })
      return json({ day, status: 'error', error: msg }, 502)
    }
  }),
)
