import { useMemo } from 'react'
import { useCaptures } from './data'
import type { Capture } from './types'

/** Marca con la que Caja reconoce sus fotos de tiquete dentro de la Bitácora. */
export const TICKET_MARK = 'Tiquete de caja'

export function isPendingTicket(c: Capture): boolean {
  return c.category === 'caja' && c.raw_input === TICKET_MARK && c.status === 'borrador' && !c.parsed_json?.applied
}

/** Fotos de tiquete subidas desde Caja que todavía no se registraron. */
export function usePendingTickets() {
  const { data: captures = [] } = useCaptures()
  return useMemo(() => captures.filter(isPendingTicket), [captures])
}
