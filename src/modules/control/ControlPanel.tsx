import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Segmented } from '@/modules/app/components'
import { useBusinessSettings, useDashboardStats, useProducts, useSalesReport } from '@/lib/data'
import { supabaseReady } from '@/lib/supabase'
import { formatCRC } from '@/lib/types'
import { C_GANANCIA, C_VENTAS, TrendGlass } from './charts'
import { Activity } from './dashboard/Activity'
import { Attention } from './dashboard/Attention'
import { BitacoraCard } from './dashboard/BitacoraCard'
import { CajaCard } from './dashboard/CajaCard'
import { InventarioCard } from './dashboard/InventarioCard'
import { Kpis } from './dashboard/Kpis'
import { ProveedoresCard } from './dashboard/ProveedoresCard'
import { TopProducts } from './dashboard/TopProducts'
import { monoLabel, timeOf } from './dashboard/format'
import { PERIODS, lastDays, rangeOf, type Period } from './dashboard/period'
import { fmtDate } from '@/lib/time'

/** Tablero operativo: lo que importa hoy de cada módulo, con datos reales de Supabase. */
export function ControlPanel() {
  const qc = useQueryClient()
  const [period, setPeriod] = useState<Period>('hoy')
  const range = useMemo(() => rangeOf(period), [period])
  const t14 = useMemo(() => lastDays(14), [])

  const report = useSalesReport(range.from, range.to, 'day')
  const prev = useSalesReport(range.prevFrom, range.prevTo, 'day')
  const trend = useSalesReport(t14.from, t14.to, 'day')
  const { data: stats, isError: statsErr } = useDashboardStats()
  const { data: products = [] } = useProducts()
  const { data: settings } = useBusinessSettings()

  // Sin Realtime todavía: el tablero se refresca solo cada minuto.
  useEffect(() => {
    const id = setInterval(() => qc.invalidateQueries(), 60_000)
    return () => clearInterval(id)
  }, [qc])

  const points = trend.data?.trend ?? []
  const sumV = points.reduce((a, p) => a + p.ventas, 0)
  const sumG = points.reduce((a, p) => a + p.ganancia, 0)
  const out = products.filter((p) => p.stock_qty <= 0).length
  const low = products.filter((p) => p.stock_qty > 0 && p.stock_qty <= p.min_qty).length
  const online = supabaseReady && !report.isError && !statsErr
  const updated = report.dataUpdatedAt ? timeOf(new Date(report.dataUpdatedAt).toISOString()) : '—'
  const dateLabel = fmtDate(new Date(), { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')

  return (
    <div
      className="-mx-4 -mt-5 min-h-full px-4 pt-5 sm:-mx-6 sm:px-6 md:-mx-[clamp(16px,3vw,40px)] md:-mt-7 md:px-[clamp(16px,3vw,40px)] md:pt-7"
      style={{
        background:
          'radial-gradient(900px 420px at 20% 18%, rgba(18,132,95,0.10), transparent 70%), radial-gradient(700px 380px at 85% 30%, rgba(245,184,61,0.12), transparent 70%)',
      }}
    >
      <div className="mx-auto flex max-w-[1240px] flex-col gap-[18px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[0.75rem] font-bold tracking-[0.06em] text-ink-2 uppercase">
              {dateLabel} · {settings?.name ?? '…'}
            </div>
            <h1 className="font-display-m mt-1 text-[2.25rem] leading-[1.1] font-bold text-ink">Panel de Control</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-hair bg-white px-3 text-[0.8125rem] text-ink-2" role="status">
              <span className={`h-2 w-2 rounded-full ${online ? 'bg-ok' : 'bg-danger'}`} aria-hidden="true" />
              {online ? `Supabase conectado · act. ${updated}` : 'Sin conexión con Supabase'}
            </span>
            <div className="w-[260px]">
              <Segmented<Period> label="Período" value={period} onChange={setPeriod} options={PERIODS} />
            </div>
          </div>
        </header>

        <Attention />

        <Kpis
          report={report.data}
          prev={prev.data}
          trend={points}
          range={range}
          fiado={stats?.fiadoTotal ?? 0}
          fiadoClients={stats?.fiadoClients ?? 0}
          out={out}
          low={low}
        />

        <div className="flex flex-wrap gap-3">
          <section aria-label="Ventas y ganancia" className="glass flex min-w-0 flex-[2_1_560px] flex-col gap-3.5 p-[18px]" style={{ background: 'rgba(255,255,255,0.5)' }}>
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <div className={monoLabel}>Tendencia · 14 días</div>
                <h2 className="mt-0.5 text-[1.0625rem] font-bold text-ink">Ventas y ganancia</h2>
                <div className="font-mono-m tabular-nums text-[0.8125rem] text-ink-2">
                  Σ {formatCRC(sumV)} ventas · {formatCRC(sumG)} ganancia · margen {sumV ? ((sumG / sumV) * 100).toFixed(1).replace('.', ',') : '0'} %
                </div>
              </div>
              <div className="font-mono-m flex gap-4 text-[0.75rem] text-ink">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4" style={{ background: C_VENTAS, boxShadow: `0 0 6px ${C_VENTAS}` }} aria-hidden="true" />
                  Ventas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4" style={{ background: C_GANANCIA, boxShadow: `0 0 6px ${C_GANANCIA}` }} aria-hidden="true" />
                  Ganancia
                </span>
              </div>
            </div>
            <TrendGlass points={points} />
          </section>
          <CajaCard />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3">
          <InventarioCard />
          <ProveedoresCard />
          <BitacoraCard />
        </div>

        <div className="flex flex-wrap gap-3">
          <TopProducts report={report.data} trendReport={trend.data} trend={points} periodLabel={range.short} />
          <Activity />
        </div>
      </div>
    </div>
  )
}
