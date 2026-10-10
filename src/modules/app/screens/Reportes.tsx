import { useMemo, useState } from 'react'
import { Download, TrendingUp } from 'lucide-react'
import { Card, Chip, ScreenHeader, Segmented } from '../components'
import { useSalesReport } from '@/lib/data'
import { downloadCSV } from '@/lib/csv'
import { formatCRC } from '@/lib/types'
import { crParts, crStartOfDay } from '@/lib/time'

type Period = 'hoy' | '7d' | '30d' | 'mes'

function range(p: Period): { from: string; to: string } {
  // Días calendario de Costa Rica
  const to = new Date()
  const back = p === '7d' ? 6 : p === '30d' ? 29 : p === 'mes' ? crParts(to).day - 1 : 0
  return { from: crStartOfDay(to, -back).toISOString(), to: to.toISOString() }
}

const LABELS: Record<Period, string> = { hoy: 'Hoy', '7d': '7 días', '30d': '30 días', mes: 'Mes' }

export function Reportes() {
  const [period, setPeriod] = useState<Period>('7d')
  const [topMode, setTopMode] = useState<'margin' | 'qty'>('margin')
  const { from, to } = useMemo(() => range(period), [period])
  const { data: r, isLoading } = useSalesReport(from, to)

  const top = topMode === 'margin' ? r?.topByMargin ?? [] : r?.topByQty ?? []

  const exportDays = () => {
    if (!r) return
    downloadCSV(`ventas-${period}.csv`, [['Fecha', 'Total'], ...r.byDay.map((d) => [d.day, Math.round(d.total)])])
  }
  const exportTop = () => {
    if (!r) return
    downloadCSV(`top-productos-${period}.csv`, [
      ['Producto', 'Unidades', 'Ingreso', 'Margen'],
      ...top.map((t) => [t.name, t.qty, Math.round(t.revenue), Math.round(t.margin)]),
    ])
  }

  const maxDay = Math.max(1, ...(r?.byDay.map((d) => d.total) ?? [1]))

  return (
    <div>
      <ScreenHeader title="Reportes" subtitle="Ventas, márgenes y cuentas por cobrar." />

      <Segmented<Period>
        label="Período"
        value={period}
        onChange={setPeriod}
        options={(Object.keys(LABELS) as Period[]).map((p) => ({ id: p, label: LABELS[p] }))}
      />

      {isLoading || !r ? (
        <Card className="p-6 text-center text-ink-3">Cargando…</Card>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Card className="p-3.5">
              <div className="text-[0.8125rem] text-ink-2">Ingresos</div>
              <div className="tabular-nums text-[1.15rem] font-bold text-ink">{formatCRC(r.revenue)}</div>
            </Card>
            <Card className="p-3.5">
              <div className="text-[0.8125rem] text-ink-2">Margen</div>
              <div className="tabular-nums text-[1.15rem] font-bold text-brand">{formatCRC(r.margin)}</div>
              <Chip tone="teal">{r.marginPct.toFixed(1)}%</Chip>
            </Card>
            <Card className="p-3.5">
              <div className="text-[0.8125rem] text-ink-2">Tickets</div>
              <div className="tabular-nums text-[1.15rem] font-bold text-ink">{r.ticketCount}</div>
            </Card>
            <Card className="p-3.5">
              <div className="text-[0.8125rem] text-ink-2">Ticket promedio</div>
              <div className="tabular-nums text-[1.15rem] font-bold text-ink">{formatCRC(r.avgTicket)}</div>
            </Card>
          </div>

          {/* Chart por día */}
          <Card className="mb-3 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[0.9375rem] font-semibold text-ink">Ventas por día</div>
              <button onClick={exportDays} className="flex items-center gap-1 text-[0.8125rem] font-semibold text-brand">
                <Download size={13} /> CSV
              </button>
            </div>
            {r.byDay.length === 0 ? (
              <p className="py-4 text-center text-[0.875rem] text-ink-3">Sin ventas en el período.</p>
            ) : (
              <div className="flex h-28 items-end gap-1.5">
                {r.byDay.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-brand" style={{ height: `${(d.total / maxDay) * 100}%`, minHeight: 3 }} />
                    <div className="text-[0.8125rem] text-ink-3">{d.day.slice(8)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top productos */}
          <Card className="mb-3 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink">
                <TrendingUp size={15} className="text-brand" /> Más vendidos
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setTopMode('margin')} className={`text-[0.8125rem] font-semibold ${topMode === 'margin' ? 'text-brand' : 'text-ink-3'}`}>
                  Margen
                </button>
                <button onClick={() => setTopMode('qty')} className={`text-[0.8125rem] font-semibold ${topMode === 'qty' ? 'text-brand' : 'text-ink-3'}`}>
                  Volumen
                </button>
                <button onClick={exportTop} className="flex items-center gap-1 text-[0.8125rem] font-semibold text-brand">
                  <Download size={13} /> CSV
                </button>
              </div>
            </div>
            {top.length === 0 ? (
              <p className="py-2 text-center text-[0.875rem] text-ink-3">Sin datos.</p>
            ) : (
              <div className="space-y-1.5">
                {top.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-2 text-[0.875rem]">
                    <span className="w-4 text-ink-3">{i + 1}</span>
                    <span className="flex-1 truncate text-ink">{t.name}</span>
                    <span className="tabular-nums text-ink-3">{t.qty}u</span>
                    <span className="w-20 text-right tabular-nums font-semibold text-brand">
                      {formatCRC(topMode === 'margin' ? t.margin : t.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Cuentas por cobrar + métodos */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3.5">
              <div className="text-[0.8125rem] text-ink-2">Cuentas por cobrar</div>
              <div className="tabular-nums text-[1.1rem] font-bold text-danger">{formatCRC(r.fiadoTotal)}</div>
            </Card>
            <Card className="p-3.5">
              <div className="mb-1 text-[0.8125rem] text-ink-2">Por método</div>
              {Object.keys(r.byMethod).length === 0 ? (
                <div className="text-[0.8125rem] text-ink-3">—</div>
              ) : (
                Object.entries(r.byMethod).map(([m, v]) => (
                  <div key={m} className="flex justify-between text-[0.8125rem]">
                    <span className="capitalize text-ink-2">{m}</span>
                    <span className="tabular-nums text-ink">{formatCRC(v)}</span>
                  </div>
                ))
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
