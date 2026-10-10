import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Tarjeta blanca de módulo del tablero, con rótulo, título y enlace opcional. */
export function ModuleCard({
  label,
  title,
  to,
  linkLabel = 'Abrir',
  children,
  className = '',
}: {
  label: string
  title: ReactNode
  to?: string
  linkLabel?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-label={label} className={`flex min-w-0 flex-col gap-3.5 rounded-[18px] border border-hair bg-white p-[18px] ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.75rem] font-bold tracking-[0.06em] text-ink-2 uppercase">{label}</div>
          <h2 className="mt-0.5 text-[1.0625rem] font-bold text-ink">{title}</h2>
        </div>
        {to && (
          <Link to={to} className="shrink-0 text-[0.875rem] font-bold text-brand hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** Barra de proporción (medidor) con segmentos; el texto va aparte. */
export function StackBar({ parts, label }: { parts: { value: number; color: string }[]; label: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0)
  return (
    <div role="img" aria-label={label} className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-paper-2">
      {total > 0 &&
        parts
          .filter((p) => p.value > 0)
          .map((p, i) => <span key={i} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
    </div>
  )
}
