import { useEffect, useState } from 'react'

/** Franja del día según la hora local. */
export type DaySlot = 'buho' | 'medianoche' | 'temprano' | 'manana' | 'mediodia' | 'tarde' | 'noche'

export interface Greeting {
  slot: DaySlot
  /** Título: `lead` + `highlight` (va en color de marca) + `tail`. */
  lead: string
  highlight: string
  tail: string
  subtitle: string
}

const WEEKDAY = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function slotOf(d: Date): DaySlot {
  const m = d.getHours() * 60 + d.getMinutes()
  if (m < 60) return 'medianoche'
  if (m < 5 * 60) return 'buho'
  if (m < 7 * 60) return 'temprano'
  if (m < 11 * 60 + 30) return 'manana'
  if (m < 13 * 60 + 30) return 'mediodia'
  if (m < 18 * 60 + 30) return 'tarde'
  return 'noche'
}

/** Elige una variante estable para el día (no cambia en cada render, sí de un día a otro). */
function pick<T>(list: T[], d: Date): T {
  const seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()
  return list[seed % list.length]
}

/**
 * Saludo del Inicio: sabe la hora, el día y si es fin de semana. Nombre en `highlight`
 * salvo de madrugada, cuando el protagonista es el búho.
 */
export function greetingFor(d: Date, name: string): Greeting {
  const slot = slotOf(d)
  const day = WEEKDAY[d.getDay()]
  const time = d.toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit' })
  const weekend = d.getDay() === 0 || d.getDay() === 6

  switch (slot) {
    case 'medianoche':
      return {
        slot,
        lead: 'Es medianoche, ',
        highlight: name,
        tail: '',
        subtitle: pick([`Son las ${time}. Reviso lo del día y te dejo descansar.`, 'El día ya cerró. ¿Cuadramos antes de dormir?'], d),
      }
    case 'buho':
      return {
        slot,
        lead: '¿Qué pasa, ',
        highlight: 'búho nocturno',
        tail: '?',
        subtitle: pick([`Son las ${time}, ${name}. Yo vigilo la tienda; vos dormí.`, `${time} y seguís despierto. ¿Algo urgente?`], d),
      }
    case 'temprano':
      return {
        slot,
        lead: 'Madrugando, ',
        highlight: name,
        tail: '',
        subtitle: pick(['El café primero; yo ya revisé los números.', `Arranca el ${day}. ¿Abrimos caja?`], d),
      }
    case 'manana':
      return {
        slot,
        lead: 'Buenos días, ',
        highlight: name,
        tail: '',
        subtitle: pick([`Hoy es ${day} por la mañana, ¿qué revisamos?`, weekend ? 'Mañana de fin de semana: buen día para vender.' : `Buen ${day}. Te cuento cómo vamos.`], d),
      }
    case 'mediodia':
      return {
        slot,
        lead: 'Es mediodía, ',
        highlight: name,
        tail: '',
        subtitle: pick(['Hora del almuerzo: la caja suele moverse ahora.', `Mitad del ${day}. ¿Vemos cómo va la meta?`], d),
      }
    case 'tarde':
      return {
        slot,
        lead: 'Buenas tardes, ',
        highlight: name,
        tail: '',
        subtitle: pick([`Hoy es ${day} por la tarde, ¿qué revisamos?`, 'La tarde es buena para pedir a proveedores.'], d),
      }
    default:
      return {
        slot,
        lead: 'Buenas noches, ',
        highlight: name,
        tail: '',
        subtitle: pick([`Hoy es ${day} por la noche, ¿qué revisamos?`, 'Antes de cerrar, ¿cuadramos la caja?'], d),
      }
  }
}

/** Hora actual que se actualiza cada minuto (para que el saludo cambie solo). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    // Alinea al cambio de minuto y luego cada 60 s.
    const first = setTimeout(() => {
      tick()
      id = setInterval(tick, 60_000)
    }, 60_000 - (Date.now() % 60_000))
    let id: ReturnType<typeof setInterval> | undefined
    return () => {
      clearTimeout(first)
      if (id) clearInterval(id)
    }
  }, [])
  return now
}
