import { crEndOfDay, crStartOfDay, fmtDate } from '@/lib/time'

export type Period = 'hoy' | '7d' | '30d'

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
]

export interface Range {
  from: string
  to: string
  prevFrom: string
  prevTo: string
  /** «vs sáb pasado» / «vs 7 días previos» */
  vsLabel: string
  /** «hoy» / «7 días» / «30 días» */
  short: string
}

/**
 * Rango del período en días calendario de Costa Rica (de las 00:00 del primer día al
 * final de hoy) y el de comparación: «Hoy» se compara con el mismo día de la semana
 * pasada; 7 y 30 días, con la ventana anterior del mismo largo. `to` es el final del
 * día para que la clave de la consulta no cambie a cada minuto.
 */
export function rangeOf(p: Period, now = new Date()): Range {
  const days = p === 'hoy' ? 1 : p === '7d' ? 7 : 30
  const shift = p === 'hoy' ? 7 : days
  const weekday = fmtDate(now, { weekday: 'short' }).replace('.', '')
  return {
    from: crStartOfDay(now, -(days - 1)).toISOString(),
    to: crEndOfDay(now).toISOString(),
    prevFrom: crStartOfDay(now, -(days - 1) - shift).toISOString(),
    prevTo: crEndOfDay(now, -shift).toISOString(),
    vsLabel: p === 'hoy' ? `vs ${weekday} pasado` : `vs ${days} días previos`,
    short: p === 'hoy' ? 'hoy' : `${days} días`,
  }
}

/** Últimos `days` días calendario de Costa Rica hasta hoy (tendencia y sparklines). */
export function lastDays(days: number, now = new Date()): { from: string; to: string } {
  return { from: crStartOfDay(now, -(days - 1)).toISOString(), to: crEndOfDay(now).toISOString() }
}
