import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Card, ProgressBar, ScreenHeader, Segmented } from '../components'
import { TrendChart } from '@/components/TrendChart'
import { useProducts, useSalesReport, useSuppliers, type TrendGranularity } from '@/lib/data'
import { profitSuggestion } from '@/lib/suggestions'
import { formatCRC } from '@/lib/types'

type Period = 'dia' | 'semana' | 'mes'

const PERIODS: Record<Period, { label: string; caption: string; days: number; gran: TrendGranularity }> = {
  dia: { label: 'Día', caption: 'Hoy, por hora', days: 1, gran: 'hour' },
  semana: { label: 'Semana', caption: 'Últimos 7 días', days: 7, gran: 'day' },
  mes: { label: 'Mes', caption: 'Últimos 30 días', days: 30, gran: 'day' },
}

function range(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  from.setDate(from.getDate() - (days - 1))
  return { from: from.toISOString(), to: to.toISOString() }
}

export function Ventas() {
  const [period, setPeriod] = useState<Period>('dia')
  const cfg = PERIODS[period]
  const { from, to } = useMemo(() => range(cfg.days), [cfg.days])
  const { data: r, isLoading, isPlaceholderData } = useSalesReport(from, to, cfg.gran)
  const { data: products = [] } = useProducts()
  const { data: suppliers = [] } = useSuppliers()

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products])
  const supplierName = (id: string | null | undefined) => suppliers.find((s) => s.id === id)?.name

  const top = r?.topByMargin ?? []
  const maxMargin = Math.max(1, ...top.map((t) => t.margin))

  return (
    <div>
      <ScreenHeader title="Ventas" subtitle="Tu rentabilidad, alimentada por la caja y el inventario." />

      <Segmented<Period>
        label="Período"
        value={period}
        onChange={setPeriod}
        options={(Object.keys(PERIODS) as Period[]).map((p) => ({ id: p, label: PERIODS[p].label }))}
      />

      {isLoading || !r ? (
        <Card className="p-6 text-center text-ink-3">Cargando…</Card>
      ) : (
        <div className={isPlaceholderData ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          {/* Resumen + tendencia */}
          <Card className="mb-4 p-4">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[0.8125rem] font-medium text-ink-2">Ventas</div>
                <div className="font-display-m tabular-nums text-[1.625rem] leading-tight font-bold text-ink">{formatCRC(r.revenue)}</div>
              </div>
              <div>
                <div className="text-[0.8125rem] font-medium text-ink-2">Ganancia</div>
                <div className="font-display-m tabular-nums text-[1.625rem] leading-tight font-bold text-brand">{formatCRC(r.margin)}</div>
                <div className="tabular-nums text-[0.8125rem] font-semibold text-ink-2">Margen {r.marginPct.toFixed(1)} %</div>
              </div>
            </div>
            <TrendChart points={r.trend} caption={cfg.caption} />
          </Card>

          {/* Top 10 por ganancia + sugerencias */}
          <div className="mb-2 flex items-baseline justify-between px-0.5">
            <h2 className="text-base font-bold text-ink">Más ganancia</h2>
            <span className="text-[0.8125rem] text-ink-2">Top 10 · {cfg.caption.toLowerCase()}</span>
          </div>
          {top.length === 0 ? (
            <Card className="p-6 text-center text-[0.875rem] text-ink-3">
              Todavía no hay ventas en el período. Registrá los tiquetes en la Caja para ver la rentabilidad.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {top.map((t, i) => {
                const prod = productById[t.productId]
                const sug = profitSuggestion(prod, t.marginPct, supplierName(prod?.supplier_id))
                return (
                  <Card key={t.productId} className="p-3.5">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-tint text-[0.8125rem] font-bold text-brand">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-[0.9375rem] font-semibold text-ink">{t.name}</span>
                      <span className="tabular-nums text-[0.9375rem] font-bold text-brand">{formatCRC(t.margin)}</span>
                    </div>
                    <div className="mb-2"><ProgressBar pct={(t.margin / maxMargin) * 100} /></div>
                    <div className="mb-2 flex items-center gap-3 text-[0.8125rem] text-ink-3">
                      <span>{t.qty} u vendidas</span>
                      <span>·</span>
                      <span>margen {t.marginPct.toFixed(0)}%</span>
                      {prod && <span>· inv. {prod.stock_qty}</span>}
                    </div>
                    <div className="flex items-start gap-2 rounded-[10px] bg-marigold-tint px-2.5 py-2">
                      <Sparkles size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
                      <p className="text-[0.8125rem] leading-snug text-ink-2">{sug}</p>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
