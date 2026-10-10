import { crDayKey, fmtDate, fmtTime } from '@/lib/time'

export const monoLabel = 'font-mono-m text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-2 uppercase'

export function timeOf(iso: string): string {
  return fmtTime(iso)
}

/** Hora si es de hoy (Costa Rica); si no, día + hora. */
export function whenOf(iso: string): string {
  const d = new Date(iso)
  if (crDayKey(d) === crDayKey()) return timeOf(iso)
  return fmtDate(d, { day: 'numeric', month: 'short' }) + ' ' + timeOf(iso)
}
