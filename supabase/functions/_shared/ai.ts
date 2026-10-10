// MiniOS · núcleo compartido de las Edge Functions de IA.
//  - auth: verifica la sesión DENTRO de la función (el gateway no valida las
//    llaves ES256 nuevas), y entrega un cliente "del usuario" (respeta RLS)
//    más uno de servicio (solo para registrar gasto y guardar resultados).
//  - guard: interruptor de IA, presupuesto diario duro y límite por usuario/hora.
//  - costo: convierte el uso de tokens en USD para llevar el gasto al día.
import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Envuelve un handler: preflight CORS + errores controlados (nunca filtra detalles internos). */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
    try {
      return await fn(req)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      if (e instanceof Anthropic.APIError) {
        console.error('Anthropic API error', e.status, e.message)
        return json({ error: friendlyApiError(e) }, e.status && e.status >= 400 && e.status < 600 ? (e.status === 401 ? 502 : e.status) : 502)
      }
      console.error('Error inesperado', e)
      return json({ error: 'Error interno de la IA' }, 500)
    }
  }
}

function friendlyApiError(e: InstanceType<typeof Anthropic.APIError>): string {
  const msg = (e.message ?? '').toLowerCase()
  if (e.status === 401 || e.status === 403) return 'La llave de la IA no es válida o fue revocada.'
  if (msg.includes('credit balance')) return 'La cuenta de Anthropic no tiene saldo. Recargá crédito en console.anthropic.com.'
  if (e.status === 429 || e.status === 529) return 'La IA está saturada. Reintentá en un minuto.'
  if (e.status === 400) return 'La IA rechazó la solicitud (documento o pregunta no válidos).'
  return 'La IA no pudo responder ahora. Reintentá.'
}

export function claude(): Anthropic {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new HttpError(503, 'La IA no está configurada (falta ANTHROPIC_API_KEY en los secrets de Supabase).')
  return new Anthropic({ apiKey, timeout: 100_000, maxRetries: 1 })
}

export interface AuthCtx {
  user: User
  /** Cliente con la sesión del usuario: aplica RLS (lo que el usuario puede ver, y nada más). */
  db: SupabaseClient
  /** Service role: SOLO para registrar gasto y guardar resultados de la IA. */
  admin: SupabaseClient
}

export async function requireUser(req: Request): Promise<AuthCtx> {
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) throw new HttpError(401, 'Iniciá sesión para usar la IA.')
  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  })
  const { data, error } = await db.auth.getUser(auth.slice(7))
  if (error || !data.user) throw new HttpError(401, 'Sesión inválida o vencida. Volvé a entrar.')
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  return { user: data.user, db, admin }
}

// Límite por usuario por hora (frena bucles y abusos; el presupuesto diario es el tope duro).
const HOURLY_LIMIT: Record<string, number> = { 'capture-parse': 40, assistant: 80 }

export async function guard(admin: SupabaseClient, userId: string, fn: 'capture-parse' | 'assistant') {
  const { data: s } = await admin.from('business_settings').select('ai_enabled, ai_daily_budget_usd').eq('id', 1).maybeSingle()
  if (s && s.ai_enabled === false) throw new HttpError(403, 'La IA está desactivada (Configuración → IA).')

  const budget = Number(s?.ai_daily_budget_usd ?? 2)
  const { data: spent } = await admin.rpc('ai_spend_today')
  if (Number(spent ?? 0) >= budget) {
    throw new HttpError(429, `Se alcanzó el presupuesto diario de IA (US$${budget.toFixed(2)}). Podés subirlo en Configuración.`)
  }

  const since = new Date(Date.now() - 3_600_000).toISOString()
  const { count } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('fn', fn)
    .gte('created_at', since)
  if ((count ?? 0) >= HOURLY_LIMIT[fn]) throw new HttpError(429, 'Demasiadas consultas de IA en la última hora. Esperá un rato.')
}

// USD por millón de tokens (entrada / salida). Modelo desconocido → se asume el más caro (nunca subestimar).
const PRICES: Record<string, { in: number; out: number }> = {
  'claude-haiku-4-5': { in: 1, out: 5 },
  'claude-sonnet-5-5': { in: 2, out: 10 },
  'claude-sonnet-5': { in: 2, out: 10 },
  'claude-opus-5-5': { in: 4, out: 20 },
}

export interface Usage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}

export function costUsd(model: string, u: Usage): number {
  const p = PRICES[model] ?? PRICES['claude-opus-5-5']
  return (
    (u.input_tokens * p.in +
      u.output_tokens * p.out +
      (u.cache_read_input_tokens ?? 0) * p.in * 0.1 +
      (u.cache_creation_input_tokens ?? 0) * p.in * 1.25) /
    1e6
  )
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
    cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
  }
}

export async function logUsage(
  admin: SupabaseClient,
  row: { userId: string; fn: 'capture-parse' | 'assistant'; model: string; usage: Usage; refId?: string | null },
): Promise<number> {
  const cost = costUsd(row.model, row.usage)
  const { error } = await admin.from('ai_usage').insert({
    user_id: row.userId,
    fn: row.fn,
    model: row.model,
    input_tokens: row.usage.input_tokens,
    output_tokens: row.usage.output_tokens,
    cache_read_tokens: row.usage.cache_read_input_tokens ?? 0,
    cache_write_tokens: row.usage.cache_creation_input_tokens ?? 0,
    cost_usd: Number(cost.toFixed(6)),
    ref_id: row.refId ?? null,
  })
  if (error) console.error('No se pudo registrar el gasto de IA', error.message)
  return cost
}

/** minúsculas, sin tildes ni signos: para comparar nombres de forma tolerante. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Medianoche de Costa Rica (UTC−6, sin horario de verano) de hoy, en ISO. */
export function crDayStartISO(daysBack = 0): string {
  const cr = new Date(Date.now() - 6 * 3_600_000)
  cr.setUTCHours(0, 0, 0, 0)
  cr.setUTCDate(cr.getUTCDate() - daysBack)
  return new Date(cr.getTime() + 6 * 3_600_000).toISOString()
}
