import type { ReactNode } from 'react'

/**
 * Componentes base del sistema «Mostrador» (app móvil).
 * Tokens en styles/tokens.css (--m-*) y expuestos a Tailwind como
 * paper / ink / ink-2 / ink-3 / hair / brand / marigold / warn / danger.
 * Guía completa: docs/DESIGN_SYSTEM.md.
 */

/** Tarjeta blanca con borde fino (sin sombras pesadas). */
export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const base = `rounded-[18px] border border-hair bg-white ${className}`
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} w-full text-left transition-transform active:scale-[0.99]`}>
        {children}
      </button>
    )
  }
  return <div className={base}>{children}</div>
}

export type Tone = 'teal' | 'brand' | 'amber' | 'rose' | 'neutral'

/** Etiqueta de estado. 'teal' se mantiene como alias de 'brand' por compatibilidad. */
export function Chip({ children, tone = 'brand' }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    teal: 'bg-brand-tint text-brand',
    brand: 'bg-brand-tint text-brand',
    amber: 'bg-warn-tint text-warn',
    rose: 'bg-danger-tint text-danger',
    neutral: 'bg-paper-2 text-ink-2',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  )
}

/** Encabezado de pantalla: título display + subtítulo + acción opcional. */
export function ScreenHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display-m text-[1.875rem] leading-[1.1] font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[0.875rem] text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

/** Rótulo de sección en mayúsculas pequeñas. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-[0.75rem] font-bold tracking-[0.06em] text-ink-2 uppercase ${className}`}>{children}</div>
}

/** Barra de progreso. `tone` cambia el relleno. */
export function ProgressBar({
  pct,
  tone = 'brand',
  track = 'bg-paper-2',
  height = 'h-1.5',
}: {
  pct: number
  tone?: 'brand' | 'marigold' | 'warn' | 'danger'
  track?: string
  height?: string
}) {
  const fill = { brand: 'bg-brand', marigold: 'bg-marigold', warn: 'bg-[#d97706]', danger: 'bg-danger' }[tone]
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div className={`${height} w-full overflow-hidden rounded-full ${track}`} role="presentation">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${w}%` }} />
    </div>
  )
}

/** Control segmentado (Día/Semana/Mes, filtros). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: ReactNode }[]
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 grid gap-1 rounded-[14px] bg-hair p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-10 rounded-[10px] text-[0.875rem] transition-colors ${
            value === o.id ? 'bg-white font-bold text-ink shadow-[0_1px_3px_rgba(27,31,28,0.12)]' : 'font-semibold text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Interruptor accesible (role="switch"). */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-8 w-[52px] shrink-0 rounded-full p-[3px] transition-colors ${checked ? 'justify-end bg-brand' : 'justify-start bg-hair-strong'}`}
    >
      <span className="h-[26px] w-[26px] rounded-full bg-white shadow-sm" />
    </button>
  )
}
