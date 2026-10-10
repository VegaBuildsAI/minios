import { Download } from 'lucide-react'
import { downloadCSV } from '@/lib/csv'
import type { SalesReport, TrendPoint } from '@/lib/data'
import { formatCRC } from '@/lib/types'
import { C_VENTAS, Sparkline } from '../charts'

/** Top 6 por ganancia del período, con la tendencia de ganancia de los últimos 7 días. */
export function TopProducts({ report, trendReport, trend, periodLabel }: { report?: SalesReport; trendReport?: SalesReport; trend: TrendPoint[]; periodLabel: string }) {
  const rows = (report?.topByMargin ?? []).slice(0, 6)
  const days7 = trend.slice(-7).map((t) => t.key)
  const spark = (pid: string) => days7.map((k) => trendReport?.marginByProductBucket[pid]?.[k] ?? 0)

  const exportCsv = () =>
    downloadCSV(`top-productos-${periodLabel.replace(/\s/g, '')}.csv`, [
      ['#', 'Producto', 'Vendidos', 'Ventas', 'Margen %', 'Ganancia'],
      ...rows.map((r, i) => [i + 1, r.name, r.qty, Math.round(r.revenue), r.marginPct.toFixed(1), Math.round(r.margin)]),
    ])

  return (
    <section aria-label="Productos que más ganancia dejan" className="flex min-w-0 flex-[2_1_560px] flex-col gap-2.5 rounded-[18px] border border-hair bg-white p-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[1.0625rem] font-bold text-ink">Productos que más ganancia dejan · {periodLabel}</h2>
        <button
          onClick={exportCsv}
          disabled={!rows.length}
          className="flex h-11 items-center gap-1.5 rounded-xl px-2 text-[0.875rem] font-bold text-brand hover:bg-brand-tint disabled:opacity-40"
        >
          <Download size={16} aria-hidden="true" /> Exportar CSV
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[0.9375rem] text-ink-2">Sin ventas en el período. Registrá tiquetes en la Caja para ver la rentabilidad.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabular-nums w-full min-w-[560px] border-collapse text-[0.875rem]">
            <thead>
              <tr className="text-left text-[0.8125rem] text-ink-2">
                <th scope="col" className="px-1.5 py-2 font-semibold">#</th>
                <th scope="col" className="px-1.5 py-2 font-semibold">Producto</th>
                <th scope="col" className="px-1.5 py-2 text-right font-semibold">Vendidos</th>
                <th scope="col" className="px-1.5 py-2 text-right font-semibold">Ventas</th>
                <th scope="col" className="px-1.5 py-2 text-right font-semibold">Margen</th>
                <th scope="col" className="w-[32%] px-1.5 py-2 font-semibold">Ganancia · tendencia 7 d</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.productId} className="border-t border-paper-2">
                  <td className="px-1.5 py-2.5 text-ink-2">{i + 1}</td>
                  <td className="px-1.5 py-2.5 font-semibold text-ink">{r.name}</td>
                  <td className="px-1.5 py-2.5 text-right">{r.qty}</td>
                  <td className="px-1.5 py-2.5 text-right">{formatCRC(r.revenue)}</td>
                  <td className={`px-1.5 py-2.5 text-right font-semibold ${r.marginPct < 15 ? 'text-warn' : 'text-ink'}`}>{Math.round(r.marginPct)} %</td>
                  <td className="px-1.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="min-w-[60px] flex-1">
                        <Sparkline values={spark(r.productId)} color={C_VENTAS} height={24} fill={false} />
                      </div>
                      <b className="w-[76px] text-right">{formatCRC(r.margin)}</b>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
