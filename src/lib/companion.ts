import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBriefing, localDayKey, useBusinessSettings, useCaptureStats, useDashboardStats, useSuppliers, type Briefing } from './data'
import { useInsights } from './insights'
import { usePendingTickets } from './tickets'
import { formatCRC } from './types'
import { DAYS, visitsOn } from './visits'
import type { DaySlot } from './greeting'
import { crParts } from './time'

/** Ánimo del robot: cambia con los datos y con lo que hace el usuario. */
export type Mood = 'happy' | 'excited' | 'worried' | 'sleepy' | 'thinking' | 'wink'

export interface BotMessage {
  id: string
  title: string
  text: string
  to: string
  mood: Mood
}

const LAST_KEY = 'minios-home-last'

interface LastVisit {
  day: string
  count: number
  total: number
}

function readLast(): LastVisit | null {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    return raw ? (JSON.parse(raw) as LastVisit) : null
  } catch {
    return null
  }
}

/**
 * Lo que el compañero del Inicio tiene para decir, ordenado por prioridad.
 * Todo sale de datos reales; el primero define el ánimo con el que saluda.
 */
export function useCompanion(goal: number, slot: DaySlot) {
  const { insights, isLoading } = useInsights()
  const { data: stats } = useDashboardStats()
  const { data: caps } = useCaptureStats()
  const { data: suppliers = [] } = useSuppliers()
  const pending = usePendingTickets()
  // Se lee una sola vez: la visita anterior, antes de guardar la actual.
  const [last] = useState(readLast)

  useEffect(() => {
    if (!stats) return
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ day: localDayKey(new Date()), count: stats.salesTodayCount, total: stats.salesTodayTotal }))
    } catch {
      /* almacenamiento bloqueado: sin «desde tu última visita» */
    }
  }, [stats])

  const messages = useMemo<BotMessage[]>(() => {
    const out: BotMessage[] = []
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

    const critical = insights.filter((i) => i.severity === 'critico')
    if (critical.length) {
      out.push({
        id: 'critical',
        title: critical.length === 1 ? critical[0].title : `${critical.length} cosas urgentes`,
        text: critical.length === 1 ? critical[0].detail : critical.slice(0, 2).map((c) => c.title).join(' · '),
        to: '/app/alerta',
        mood: 'worried',
      })
    }
    if (pending.length) {
      out.push({
        id: 'tickets',
        title: `${plural(pending.length, 'tiquete', 'tiquetes')} sin registrar`,
        text: 'Si no los enrutamos, el inventario no baja. ¿Los terminamos?',
        to: '/app/caja',
        mood: 'worried',
      })
    }
    if (stats && last && last.day === localDayKey(new Date()) && stats.salesTodayCount > last.count) {
      const n = stats.salesTodayCount - last.count
      out.push({
        id: 'delta',
        title: `¡${plural(n, 'tiquete nuevo', 'tiquetes nuevos')}!`,
        text: `Desde tu última visita entraron ${formatCRC(stats.salesTodayTotal - last.total)}.`,
        to: '/app/ventas',
        mood: 'excited',
      })
    }
    if (stats && goal > 0 && stats.salesTodayTotal >= goal) {
      out.push({ id: 'goal', title: '¡Meta del día cumplida!', text: `Vamos en ${formatCRC(stats.salesTodayTotal)}. Lo que entre ahora es extra.`, to: '/app/ventas', mood: 'excited' })
    } else if (stats && (slot === 'tarde' || slot === 'noche') && stats.salesTodayTotal < goal / 2) {
      const pct = Math.round((stats.salesTodayTotal / goal) * 100)
      out.push({ id: 'goal', title: `Vamos al ${pct} % de la meta`, text: 'Falta empujar. ¿Registramos los tiquetes de hoy?', to: '/app/caja', mood: 'thinking' })
    }
    const review = caps?.byStatus.borrador ?? 0
    if (review) {
      out.push({
        id: 'bitacora',
        title: `${plural(review, 'entrada espera', 'entradas esperan')} revisión`,
        text: 'Las leí con IA; solo falta que las confirmés.',
        to: '/app/bitacora',
        mood: 'thinking',
      })
    }
    const visiting = suppliers.filter((s) => visitsOn(s, DAYS[crParts().dow]))
    if (visiting.length) {
      out.push({
        id: 'supplier',
        title: `${visiting[0].name} ${visiting.length > 1 ? `y ${visiting.length - 1} más visitan` : 'visita'} hoy`,
        text: 'Revisemos qué pedir antes de que llegue.',
        to: '/app/proveedores',
        mood: 'happy',
      })
    }
    const lows = insights.filter((i) => i.severity === 'aviso')
    if (lows.length) {
      out.push({ id: 'low', title: `${plural(lows.length, 'producto', 'productos')} bajo mínimo`, text: lows[0].detail, to: '/app/inventario', mood: 'thinking' })
    }
    // Siempre hay algo más que contar al tocarlo: el resumen del día y una invitación a hablarle.
    if (out.length && stats) {
      out.push({
        id: 'summary',
        title: `Hoy: ${plural(stats.salesTodayCount, 'tiquete', 'tiquetes')} · ${formatCRC(stats.salesTodayTotal)}`,
        text: stats.criticalCount ? `Y ${plural(stats.criticalCount, 'producto necesita', 'productos necesitan')} atención.` : 'El inventario está al día.',
        to: '/app/ventas',
        mood: 'happy',
      })
      out.push({
        id: 'ask',
        title: '¿Me preguntás algo?',
        text: 'Tocá el micrófono y hablame: busco en ventas, inventario y facturas.',
        to: '/app/assistant',
        mood: 'happy',
      })
    }
    if (!out.length) {
      out.push({
        id: 'ok',
        title: slot === 'buho' || slot === 'medianoche' ? 'Todo tranquilo por aquí.' : 'Todo en orden por ahora.',
        text: 'Podemos revisar inventario, pedidos, facturas o reportes.',
        to: '/app/assistant',
        mood: slot === 'buho' || slot === 'medianoche' ? 'sleepy' : 'happy',
      })
    }
    return out
  }, [insights, pending.length, stats, last, goal, slot, caps, suppliers])

  return { messages, loading: isLoading || !stats }
}

const BRIEF_KEY = 'minios-briefing'
const BRIEF_TTL = 45 * 60_000

interface CachedBriefing {
  fp: string
  at: number
  data: Briefing
}

function readBrief(fp: string): CachedBriefing | undefined {
  try {
    const c = JSON.parse(localStorage.getItem(BRIEF_KEY) ?? 'null') as CachedBriefing | null
    return c && c.fp === fp && Date.now() - c.at < BRIEF_TTL ? c : undefined
  } catch {
    return undefined
  }
}

/**
 * Mensaje de «Mini» redactado por la IA con el estado real del negocio. Solo se vuelve a
 * pedir cuando algo cambia (huella: día, franja, ventas, críticos, pendientes) o pasados
 * 45 min; mientras tanto se reutiliza el último (también entre aperturas de la app).
 * Si la IA está apagada o falla, el Inicio usa los avisos locales.
 */
export function useBriefing(goal: number, slot: DaySlot) {
  const { data: stats } = useDashboardStats()
  const { data: settings } = useBusinessSettings()
  const { data: caps } = useCaptureStats()
  const pending = usePendingTickets()
  const fp = stats
    ? [localDayKey(new Date()), slot, stats.salesTodayCount, stats.criticalCount, pending.length, caps?.byStatus.borrador ?? 0].join('|')
    : ''
  const cached = fp ? readBrief(fp) : undefined
  const q = useQuery({
    queryKey: ['briefing', fp],
    enabled: !!fp && settings?.ai_enabled !== false,
    staleTime: BRIEF_TTL,
    retry: false,
    refetchOnWindowFocus: false,
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.at,
    queryFn: async (): Promise<Briefing> => {
      const b = await fetchBriefing(goal)
      try {
        localStorage.setItem(BRIEF_KEY, JSON.stringify({ fp, at: Date.now(), data: b }))
      } catch {
        /* sin caché persistente */
      }
      return b
    },
  })
  return { briefing: q.data, loading: q.isFetching, error: q.isError, at: q.dataUpdatedAt, aiOff: settings?.ai_enabled === false }
}
