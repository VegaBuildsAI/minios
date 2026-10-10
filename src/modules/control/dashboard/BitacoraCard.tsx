import { useAiSpendToday, useAiUsageSummary, useBusinessSettings, useCaptureStats } from '@/lib/data'
import type { Capture } from '@/lib/types'
import { ModuleCard } from './ui'
import { whenOf } from './format'

function describe(c: Capture): string {
  const ai = c.parsed_json?.ai
  if (ai?.resumen) return ai.resumen
  if (c.raw_input === 'Tiquete de caja') return 'Foto de tiquete'
  if (c.type === 'voice') return `Nota de voz · ${c.raw_input ?? ''}`.trim()
  if (c.type === 'text') return c.raw_input ?? 'Nota'
  return c.file_name ?? 'Archivo'
}

export function BitacoraCard() {
  const { data: stats } = useCaptureStats()
  const { data: spend = 0 } = useAiSpendToday()
  const { data: usage } = useAiUsageSummary()
  const { data: settings } = useBusinessSettings()
  const budget = settings?.ai_daily_budget_usd ?? 2
  const pct = Math.min(100, (spend / Math.max(0.01, budget)) * 100)
  const s = stats?.byStatus ?? { borrador: 0, procesado: 0, archivado: 0 }

  return (
    <ModuleCard label="Bitácora e IA" title={`${stats?.total ?? 0} entradas · 30 días`} to="/app/bitacora">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-warn-tint p-2.5">
          <div className="font-display-m tabular-nums text-[1.5rem] font-bold text-warn">{s.borrador}</div>
          <div className="text-[0.8125rem] font-semibold text-warn">Por revisar</div>
        </div>
        <div className="rounded-xl bg-brand-tint p-2.5">
          <div className="font-display-m tabular-nums text-[1.5rem] font-bold text-brand">{s.procesado}</div>
          <div className="text-[0.8125rem] font-semibold text-brand">Procesadas</div>
        </div>
        <div className="rounded-xl bg-paper-2 p-2.5">
          <div className="font-display-m tabular-nums text-[1.5rem] font-bold text-ink">{s.archivado}</div>
          <div className="text-[0.8125rem] font-semibold text-ink-2">Archivadas</div>
        </div>
      </div>

      <div>
        <div className="tabular-nums mb-1.5 flex justify-between text-[0.875rem]">
          <span className="font-semibold text-ink">Gasto de IA hoy</span>
          <span>
            <b>US${spend.toFixed(2)}</b> <span className="text-ink-2">de {budget.toFixed(2)}</span>
          </span>
        </div>
        <div role="img" aria-label={`Gasto de IA hoy ${Math.round(pct)} % del tope`} className="h-2 overflow-hidden rounded-full bg-paper-2">
          <div className={`h-full min-w-2 rounded-full ${pct >= 80 ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="tabular-nums mt-2.5 grid grid-cols-3 gap-2 text-[0.8125rem] text-ink-2">
          <span>
            <b className="block text-[1rem] text-ink">{usage?.byFn['capture-parse']?.calls ?? 0}</b>lecturas
          </span>
          <span>
            <b className="block text-[1rem] text-ink">{usage?.byFn.assistant?.calls ?? 0}</b>consultas
          </span>
          <span>
            <b className="block text-[1rem] text-ink">US${(usage?.total ?? 0).toFixed(2)}</b>30 días
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        {(stats?.recent ?? []).slice(0, 3).map((c) => (
          <div key={c.id} className="flex gap-2.5 border-t border-paper-2 py-2 text-[0.875rem]">
            <span className="tabular-nums w-[72px] shrink-0 text-ink-2">{whenOf(c.created_at)}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{describe(c)}</span>
          </div>
        ))}
      </div>
    </ModuleCard>
  )
}
