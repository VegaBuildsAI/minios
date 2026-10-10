import type { ReactNode } from 'react'
import type { SalesReport, TrendPoint } from '@/lib/data'
import { formatCRC } from '@/lib/types'
import { C_GANANCIA, C_VENTAS, Sparkline } from '../charts'
import { monoLabel } from './format'
import type { Range } from './period'

const GLOW_V = 'rgba(18,132,95,.45)'
const GLOW_G = 'rgba(201,131,20,.45)'

function Tile({ label, value, sub, subTone = 'neutral', children }: { label: string; value: string; sub: ReactNode; subTone?: 'up' | 'down' | 'warn' | 'neutral'; children?: ReactNode }) {
  const c = subTone === 'up' ? 'text-ok' : subTone === 'down' ? 'text-danger' : subTone === 'warn' ? 'text-warn' : 'text-ink-2'
  return (
    <div className="glass flex min-w-0 flex-col gap-1.5 px-4 pt-4 pb-3">
      <div className={monoLabel}>{label}</div>
      <div className="font-mono-m tabular-nums text-[1.625rem] leading-tight font-semibold text-ink">{value}</div>
      <div className={`font-mono-m tabular-nums text-[0.75rem] font-medium ${c}`}>{sub}</div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function delta(cur: number, prev: number, vs: string): { text: string; tone: 'up' | 'down' | 'neutral' } {
  if (!prev) return { text: cur ? `sin datos ${vs}` : '—', tone: 'neutral' }
  const pct = Math.round(((cur - prev) / prev) * 100)
  if (pct === 0) return { text: `= ${vs}`, tone: 'neutral' }
  return { text: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)} % ${vs}`, tone: pct > 0 ? 'up' : 'down' }
}

const salesTotal = (r?: SalesReport) => (r ? Object.values(r.byMethod).reduce((a, v) => a + v, 0) : 0)

/** 5 indicadores en vidrio. Las sparklines usan los últimos 10 días (no dependen del período). */
export function Kpis({
  report,
  prev,
  trend,
  range,
  fiado,
  fiadoClients,
  out,
  low,
}: {
  report?: SalesReport
  prev?: SalesReport
  trend: TrendPoint[]
  range: Range
  fiado: number
  fiadoClients: number
  out: number
  low: number
}) {
  const last10 = trend.slice(-10)
  const ventas = salesTotal(report)
  const dV = delta(ventas, salesTotal(prev), range.vsLabel)
  const dT = delta(report?.avgTicket ?? 0, prev?.avgTicket ?? 0, range.vsLabel)
  const crit = out + low

  return (
    <section aria-label="Indicadores" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      <Tile label={`Ventas · ${range.short}`} value={formatCRC(ventas)} sub={dV.text} subTone={dV.tone}>
        <Sparkline values={last10.map((p) => p.ventas)} color={C_VENTAS} glow={GLOW_V} />
      </Tile>
      <Tile label={`Ganancia · ${range.short}`} value={formatCRC(report?.margin ?? 0)} sub={`margen ${(report?.marginPct ?? 0).toFixed(1).replace('.', ',')} %`}>
        <Sparkline values={last10.map((p) => p.ganancia)} color={C_GANANCIA} glow={GLOW_G} />
      </Tile>
      <Tile label="Ticket promedio" value={formatCRC(report?.avgTicket ?? 0)} sub={`${report?.ticketCount ?? 0} tiquetes · ${dT.text}`} subTone={dT.tone}>
        <Sparkline values={last10.map((p) => (p.tickets ? p.ventas / p.tickets : 0))} color={C_VENTAS} glow={GLOW_V} />
      </Tile>
      <Tile label="Fiado por cobrar" value={formatCRC(fiado)} sub={`${fiadoClients} ${fiadoClients === 1 ? 'cliente' : 'clientes'}`}>
        <div className="flex h-[34px] items-end text-[0.75rem] text-ink-3">Saldo actual de clientes</div>
      </Tile>
      <Tile label="Inventario crítico" value={String(crit)} sub={`${out} agotados · ${low} bajo mín`} subTone={crit ? 'warn' : 'neutral'}>
        <div className="flex h-[34px] items-end">
          <div role="img" aria-label={`${out} agotados y ${low} bajo mínimo`} className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-paper-2">
            {crit > 0 && (
              <>
                <span className="bg-danger" style={{ width: `${(out / crit) * 100}%` }} />
                <span className="bg-[#D97706]" style={{ width: `${(low / crit) * 100}%` }} />
              </>
            )}
          </div>
        </div>
      </Tile>
    </section>
  )
}
