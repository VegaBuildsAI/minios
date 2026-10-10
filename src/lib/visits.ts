import type { Supplier } from './types'

/** Días tal como se guardan en `suppliers.visit_days` (sin tildes), indexados por día de la semana (0 = domingo, hora de Costa Rica). */
export const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
export const DAY_SHORT = ['D', 'L', 'M', 'K', 'J', 'V', 'S']
export const DAY_LABEL: Record<string, string> = {
  domingo: 'Domingo',
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
}

/** "Miércoles " → "miercoles" (visit_days se guardó sin tildes y a veces con mayúsculas). */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

/** ¿El proveedor visita ese día? `day` = nombre de DAYS. */
export const visitsOn = (s: Supplier, day: string) => (s.visit_days ?? []).some((d) => norm(d) === day)
