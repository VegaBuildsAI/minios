import { ArrowDownUp, ClipboardList, NotebookPen, Package, Play, Receipt, Wallet, type LucideIcon } from 'lucide-react'
import { useRecentActivity, type ActivityKind } from '@/lib/data'
import { whenOf } from './format'

const KIND: Record<ActivityKind, { icon: LucideIcon; cls: string }> = {
  tiquete: { icon: Receipt, cls: 'bg-brand-tint text-brand' },
  venta: { icon: Receipt, cls: 'bg-brand-tint text-brand' },
  inventario: { icon: Package, cls: 'bg-warn-tint text-warn' },
  bitacora: { icon: NotebookPen, cls: 'bg-brand-tint text-brand' },
  orden: { icon: ClipboardList, cls: 'bg-paper-2 text-ink' },
  turno: { icon: Play, cls: 'bg-paper-2 text-ink' },
  efectivo: { icon: Wallet, cls: 'bg-danger-tint text-danger' },
}

export function Activity() {
  const { data: items = [], isLoading } = useRecentActivity(8)
  return (
    <section aria-label="Actividad reciente" className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5 rounded-[18px] border border-hair bg-white p-[18px]">
      <h2 className="flex items-center gap-2 text-[1.0625rem] font-bold text-ink">
        <ArrowDownUp size={16} className="text-brand" aria-hidden="true" /> Actividad reciente
      </h2>
      {!isLoading && items.length === 0 && <p className="text-[0.875rem] text-ink-2">Todavía no hay actividad.</p>}
      <ol className="flex flex-col gap-3">
        {items.map((it) => {
          const K = KIND[it.kind]
          return (
            <li key={it.id} className="flex items-start gap-3">
              <span className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${K.cls}`}>
                <K.icon size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-semibold text-ink">{it.title}</span>
                <span className="tabular-nums block text-[0.8125rem] text-ink-2">
                  {whenOf(it.at)} · {it.module}
                  {it.by ? ` · ${it.by}` : ''}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
