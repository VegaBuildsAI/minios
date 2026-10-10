export const monoLabel = 'font-mono-m text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-2 uppercase'

export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

/** Hora si es de hoy; si no, día + hora. */
export function whenOf(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return timeOf(iso)
  return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ' ' + timeOf(iso)
}
