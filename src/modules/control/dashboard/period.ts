export type Period = 'hoy' | '7d' | '30d'

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
]

const DAY = 86_400_000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

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
 * Rango del período (de las 00:00 del primer día al final de hoy, en hora local) y el
 * de comparación: «Hoy» se compara con el mismo día de la semana pasada; 7 y 30 días,
 * con la ventana anterior del mismo largo. `to` es el final del día para que la clave
 * de la consulta no cambie a cada minuto.
 */
export function rangeOf(p: Period, now = new Date()): Range {
  const days = p === 'hoy' ? 1 : p === '7d' ? 7 : 30
  const today = startOfDay(now)
  const from = new Date(today.getTime() - (days - 1) * DAY)
  const to = new Date(today.getTime() + DAY - 1)
  const shift = (p === 'hoy' ? 7 : days) * DAY
  const weekday = now.toLocaleDateString('es-CR', { weekday: 'short' }).replace('.', '')
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    prevFrom: new Date(from.getTime() - shift).toISOString(),
    prevTo: new Date(to.getTime() - shift).toISOString(),
    vsLabel: p === 'hoy' ? `vs ${weekday} pasado` : `vs ${days} días previos`,
    short: p === 'hoy' ? 'hoy' : `${days} días`,
  }
}

/** Últimos `days` días calendario hasta hoy (para la tendencia y las sparklines). */
export function lastDays(days: number, now = new Date()): { from: string; to: string } {
  const today = startOfDay(now)
  return { from: new Date(today.getTime() - (days - 1) * DAY).toISOString(), to: new Date(today.getTime() + DAY - 1).toISOString() }
}
