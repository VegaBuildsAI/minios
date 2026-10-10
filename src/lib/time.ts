/**
 * Hora de Costa Rica para toda la app, sin importar la zona del dispositivo.
 * Costa Rica es UTC−6 todo el año (sin horario de verano), así que los cálculos de
 * «hoy», «medianoche» y «día de la semana» usan un desfase fijo y el formato se hace
 * con `timeZone: 'America/Costa_Rica'`.
 */
export const TZ = 'America/Costa_Rica'
const OFFSET_MS = -6 * 3_600_000
const DAY_MS = 86_400_000

export interface CrParts {
  year: number
  /** 0–11 */
  month: number
  day: number
  hour: number
  minute: number
  /** 0 = domingo */
  dow: number
}

/** Componentes de fecha/hora tal como se ven en un reloj de Costa Rica. */
export function crParts(d: Date = new Date()): CrParts {
  const w = new Date(d.getTime() + OFFSET_MS)
  return { year: w.getUTCFullYear(), month: w.getUTCMonth(), day: w.getUTCDate(), hour: w.getUTCHours(), minute: w.getUTCMinutes(), dow: w.getUTCDay() }
}

/** Instante de las 00:00 de Costa Rica del día de `d`, desplazado `addDays` días. */
export function crStartOfDay(d: Date = new Date(), addDays = 0): Date {
  const p = crParts(d)
  return new Date(Date.UTC(p.year, p.month, p.day + addDays) - OFFSET_MS)
}

/** Fin del día (23:59:59.999) de Costa Rica. */
export function crEndOfDay(d: Date = new Date(), addDays = 0): Date {
  return new Date(crStartOfDay(d, addDays + 1).getTime() - 1)
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** «2026-10-10» del día en Costa Rica. */
export function crDayKey(d: Date = new Date()): string {
  const p = crParts(d)
  return `${p.year}-${pad2(p.month + 1)}-${pad2(p.day)}`
}

/** Mediodía del día `key` (AAAA-MM-DD) en Costa Rica: seguro para formatear la fecha. */
export function crNoonOf(key: string): Date {
  return new Date(`${key}T12:00:00-06:00`)
}

export { DAY_MS }

export const fmtDate = (d: Date | string, o: Intl.DateTimeFormatOptions) => new Date(d).toLocaleDateString('es-CR', { ...o, timeZone: TZ })
export const fmtTime = (d: Date | string, o: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }) =>
  new Date(d).toLocaleTimeString('es-CR', { ...o, timeZone: TZ })
export const fmtDateTime = (d: Date | string, o: Intl.DateTimeFormatOptions) => new Date(d).toLocaleString('es-CR', { ...o, timeZone: TZ })
