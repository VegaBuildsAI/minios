import { useEffect, useState } from 'react'
import { crParts, fmtTime } from './time'

/** Franja del día según la hora de Costa Rica. */
export type DaySlot = 'buho' | 'medianoche' | 'temprano' | 'manana' | 'mediodia' | 'tarde' | 'noche'

export interface Greeting {
  slot: DaySlot
  /** Título: `lead` + `highlight` (va en color de marca) + `tail`. */
  lead: string
  highlight: string
  tail: string
  subtitle: string
}

interface Line {
  lead: string
  /** `{n}` = nombre del usuario */
  highlight: string
  tail?: string
  subtitle: string
}

const WEEKDAY = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function slotOf(d: Date = new Date()): DaySlot {
  const { hour, minute } = crParts(d)
  const m = hour * 60 + minute
  if (m < 60) return 'medianoche'
  if (m < 5 * 60) return 'buho'
  if (m < 7 * 60) return 'temprano'
  if (m < 11 * 60 + 30) return 'manana'
  if (m < 13 * 60 + 30) return 'mediodia'
  if (m < 18 * 60 + 30) return 'tarde'
  return 'noche'
}

/** Introducciones por momento del día. `{dia}` y `{hora}` se completan al usarlas. */
const LINES: Record<DaySlot, Line[]> = {
  medianoche: [
    { lead: 'Es medianoche, ', highlight: '{n}', subtitle: 'El día ya cerró. ¿Cuadramos antes de dormir?' },
    { lead: 'Medianoche en punto, ', highlight: '{n}', subtitle: 'Son las {hora}. Reviso lo del día y te dejo descansar.' },
    { lead: 'Cambio de día, ', highlight: '{n}', subtitle: 'Lo de hoy ya quedó guardado. ¿Algo antes de apagar?' },
    { lead: 'Hora de las brujas, ', highlight: '{n}', subtitle: 'Yo cuido la tienda; vos cerrá tranquilo.' },
  ],
  buho: [
    { lead: '¿Qué pasa, ', highlight: 'búho nocturno', tail: '?', subtitle: '{hora} y seguís despierto. ¿Algo urgente?' },
    { lead: 'Hola, ', highlight: 'trasnochador', tail: '', subtitle: 'Son las {hora}. La tienda está quieta; yo vigilo.' },
    { lead: '¿Insomnio, ', highlight: '{n}', tail: '?', subtitle: 'A esta hora solo pasan los gatos. Te cuento cómo quedó todo.' },
    { lead: 'Madrugada de ', highlight: 'guardia', tail: '', subtitle: '{hora}. Reviso rápido y a dormir, ¿dale?' },
  ],
  temprano: [
    { lead: 'Madrugando, ', highlight: '{n}', subtitle: 'El café primero; yo ya revisé los números.' },
    { lead: 'Pura vida, ', highlight: '{n}', subtitle: 'Arranca el {dia}. ¿Abrimos caja?' },
    { lead: 'Primero que el sol, ', highlight: '{n}', subtitle: 'Antes de abrir, veamos qué falta en las góndolas.' },
    { lead: 'Buen amanecer, ', highlight: '{n}', subtitle: 'Son las {hora}. Te dejo lo importante para arrancar.' },
  ],
  manana: [
    { lead: 'Buenos días, ', highlight: '{n}', subtitle: 'Hoy es {dia} por la mañana, ¿qué revisamos?' },
    { lead: 'Buen día, ', highlight: '{n}', subtitle: 'La mañana es para reponer y recibir proveedores.' },
    { lead: '¡Arriba, ', highlight: '{n}', tail: '!', subtitle: 'Ya revisé la tienda. Esto es lo que importa hoy.' },
    { lead: 'Qué tal la mañana, ', highlight: '{n}', subtitle: 'Te cuento cómo vamos en este {dia}.' },
    { lead: 'Buenos días, ', highlight: '{n}', subtitle: 'Mañana de {dia}: buen momento para ordenar pedidos.' },
  ],
  mediodia: [
    { lead: 'Es mediodía, ', highlight: '{n}', subtitle: 'Hora del almuerzo: la caja suele moverse ahora.' },
    { lead: 'Mitad del día, ', highlight: '{n}', subtitle: '¿Vemos cómo va la meta del {dia}?' },
    { lead: '¿Ya almorzaste, ', highlight: '{n}', tail: '?', subtitle: 'Mientras tanto, yo te resumo la mañana.' },
    { lead: 'Sol en lo alto, ', highlight: '{n}', subtitle: 'Hora pico. Revisemos que no falte nada en mostrador.' },
  ],
  tarde: [
    { lead: 'Buenas tardes, ', highlight: '{n}', subtitle: 'Hoy es {dia} por la tarde, ¿qué revisamos?' },
    { lead: 'Buenas, ', highlight: '{n}', subtitle: 'La tarde es buena para pedir a proveedores.' },
    { lead: '¿Cómo va la tarde, ', highlight: '{n}', tail: '?', subtitle: 'Te dejo el pulso del día y lo que conviene hacer.' },
    { lead: 'Tarde de {dia}, ', highlight: '{n}', subtitle: 'Todavía hay tiempo para empujar la meta.' },
    { lead: 'Hora del cafecito, ', highlight: '{n}', subtitle: 'Repasemos cómo viene el día.' },
  ],
  noche: [
    { lead: 'Buenas noches, ', highlight: '{n}', subtitle: 'Hoy es {dia} por la noche, ¿qué revisamos?' },
    { lead: 'Buenas noches, ', highlight: '{n}', subtitle: 'Antes de cerrar, ¿cuadramos la caja?' },
    { lead: 'Ya cae la noche, ', highlight: '{n}', subtitle: 'Última vuelta del día: ventas, efectivo y pendientes.' },
    { lead: 'Cerrando el {dia}, ', highlight: '{n}', subtitle: 'Te cuento cómo quedó el día.' },
    { lead: 'Noche tranquila, ', highlight: '{n}', subtitle: 'Repasemos lo de hoy y dejemos listo mañana.' },
  ],
}

/** Variantes por día especial (se suman a las de la franja). */
function specials(slot: DaySlot, dow: number, day: number, lastDay: boolean): Line[] {
  const out: Line[] = []
  const payday = day === 15 || lastDay
  if (payday && (slot === 'manana' || slot === 'mediodia' || slot === 'tarde'))
    out.push({ lead: 'Día de pago, ', highlight: '{n}', subtitle: 'Quincena: suele venderse más. Que no falte lo básico.' })
  if (dow === 5 && (slot === 'tarde' || slot === 'noche'))
    out.push({ lead: '¡Viernes, ', highlight: '{n}', tail: '!', subtitle: 'Noche fuerte: bebidas y snacks suelen volar.' })
  if (dow === 0 && (slot === 'manana' || slot === 'temprano'))
    out.push({ lead: 'Domingo, ', highlight: '{n}', subtitle: 'Día tranquilo. Buen momento para revisar la semana.' })
  if (dow === 1 && (slot === 'temprano' || slot === 'manana'))
    out.push({ lead: 'Arranca la semana, ', highlight: '{n}', subtitle: 'Lunes de pedidos: veamos qué reponer.' })
  if (dow === 6 && slot === 'manana') out.push({ lead: 'Sábado, ', highlight: '{n}', subtitle: 'Mañana de fin de semana: buen día para vender.' })
  return out
}

/** Semilla por sesión: cada vez que se abre la app sale otra introducción. */
function sessionSeed(): number {
  try {
    const k = 'minios-greet-seed'
    const v = sessionStorage.getItem(k)
    if (v) return Number(v)
    const n = Math.floor(Math.random() * 10_000)
    sessionStorage.setItem(k, String(n))
    return n
  } catch {
    return 0
  }
}

/**
 * Saludo del Inicio en hora de Costa Rica: franja del día, día de la semana, quincena.
 * Elige una introducción distinta en cada sesión y la mantiene mientras la franja no cambie.
 */
export function greetingFor(d: Date, name: string, seed = 0): Greeting {
  const slot = slotOf(d)
  const p = crParts(d)
  const lastDay = new Date(Date.UTC(p.year, p.month + 1, 0)).getUTCDate() === p.day
  const pool = [...specials(slot, p.dow, p.day, lastDay), ...LINES[slot]]
  const line = pool[(seed + p.day) % pool.length]
  const fill = (s: string) => s.replace('{n}', name).replace('{dia}', WEEKDAY[p.dow]).replace('{hora}', fmtTime(d, { hour: 'numeric', minute: '2-digit' }))
  return { slot, lead: fill(line.lead), highlight: fill(line.highlight), tail: line.tail ?? '', subtitle: fill(line.subtitle) }
}

/** Semilla estable de la sesión para `greetingFor`. */
export function useGreetingSeed(): number {
  const [seed] = useState(sessionSeed)
  return seed
}

/** Hora actual que se actualiza cada minuto (para que el saludo cambie solo). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    let id: ReturnType<typeof setInterval> | undefined
    // Alinea al cambio de minuto y luego cada 60 s.
    const first = setTimeout(() => {
      tick()
      id = setInterval(tick, 60_000)
    }, 60_000 - (Date.now() % 60_000))
    return () => {
      clearTimeout(first)
      if (id) clearInterval(id)
    }
  }, [])
  return now
}
