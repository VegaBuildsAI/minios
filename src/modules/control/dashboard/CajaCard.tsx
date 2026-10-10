import { Link } from 'react-router-dom'
import { useOpenShift, useProfiles, useShiftCash, useTodayCashMovements, useTodaySales } from '@/lib/data'
import { formatCRC, type PaymentMethod } from '@/lib/types'
import { StackBar } from './ui'
import { timeOf } from './format'

const PAY: { id: PaymentMethod; name: string; color: string }[] = [
  { id: 'efectivo', name: 'Efectivo', color: 'var(--m-cat-1)' },
  { id: 'sinpe', name: 'SINPE', color: 'var(--m-cat-2)' },
  { id: 'tarjeta', name: 'Tarjeta', color: 'var(--m-cat-3)' },
  { id: 'fiado', name: 'Fiado', color: 'var(--m-cat-4)' },
]

/** Turno, efectivo esperado en gaveta (mismo cálculo que la pantalla Caja) y cómo pagaron hoy. */
export function CajaCard() {
  const { data: shift } = useOpenShift()
  const { data: sales = [] } = useTodaySales()
  const { data: cash = [] } = useTodayCashMovements()
  const { data: profiles = [] } = useProfiles()

  // Mismo cuadre que la pantalla Caja: por turno si hay uno abierto; si no, el día.
  const { data: sc } = useShiftCash(shift)
  const dayCash =
    sales.filter((s) => s.payment_method === 'efectivo').reduce((a, s) => a + Number(s.total), 0) +
    cash.reduce((a, m) => a + (m.kind === 'ingreso' ? 1 : -1) * Number(m.amount), 0)
  const expected = shift ? (sc?.expected ?? Number(shift.opening_cash)) : dayCash
  const outsToday = cash.filter((m) => m.kind !== 'ingreso')
  const byMethod = PAY.map((p) => ({ ...p, value: sales.filter((s) => s.payment_method === p.id).reduce((a, s) => a + Number(s.total), 0) }))
  const total = byMethod.reduce((a, p) => a + p.value, 0)
  const cashier = shift?.staff_id ? profiles.find((p) => p.id === shift.staff_id)?.full_name : null

  return (
    <section aria-label="Caja" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-[18px] border border-hair bg-white p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.75rem] font-bold tracking-[0.06em] text-ink-2 uppercase">Caja</div>
          <h2 className="mt-0.5 text-[1.0625rem] font-bold text-ink">{shift ? `Turno abierto · ${timeOf(shift.opened_at)}` : 'Sin turno abierto'}</h2>
          {shift && (
            <div className="text-[0.875rem] text-ink-2">
              {cashier ?? 'Cajero'} · apertura {formatCRC(shift.opening_cash)}
            </div>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[0.75rem] font-bold ${shift ? 'bg-brand-tint text-brand' : 'bg-warn-tint text-warn'}`}>{shift ? 'En curso' : 'Cerrada'}</span>
      </div>

      <div className="rounded-[14px] bg-paper px-3.5 py-3">
        <div className="text-[0.8125rem] font-medium text-ink-2">Efectivo esperado en gaveta</div>
        <div className="font-display-m tabular-nums text-[1.625rem] font-bold text-ink">{formatCRC(expected)}</div>
      </div>

      <div>
        <div className="mb-2 text-[0.875rem] font-semibold text-ink">Cómo pagaron hoy</div>
        <StackBar
          parts={byMethod.map((p) => ({ value: p.value, color: p.color }))}
          label={total ? byMethod.map((p) => `${p.name} ${Math.round((p.value / total) * 100)} %`).join(', ') : 'Sin ventas hoy'}
        />
        <div className="mt-2.5 grid grid-cols-2 gap-x-3.5 gap-y-2">
          {byMethod.map((p) => (
            <div key={p.id} className="tabular-nums flex items-center gap-2 text-[0.875rem]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />
              <span className="flex-1 text-ink">{p.name}</span>
              <span className="font-bold text-ink">{formatCRC(p.value)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-paper-2 pt-2.5 text-[0.875rem] text-ink-2">
          Salidas de efectivo hoy: <b className="tabular-nums text-danger">{formatCRC(outsToday.reduce((a, m) => a + Number(m.amount), 0))}</b> ({outsToday.length}{' '}
          {outsToday.length === 1 ? 'movimiento' : 'movimientos'})
        </div>
      </div>

      <Link to="/app/caja" className="mt-auto flex h-11 items-center justify-center rounded-xl border border-hair-strong text-[0.875rem] font-bold text-ink hover:bg-paper">
        Ver caja
      </Link>
    </section>
  )
}
