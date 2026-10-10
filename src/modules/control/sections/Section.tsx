import type { ReactNode } from 'react'

/** Encabezado + contenido de una sección de «Conoce la app». */
export function Section({ id, label, title, children, footer }: { id: string; label: string; title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-3.5">
      <div>
        <div className="text-[0.75rem] font-bold tracking-[0.06em] text-ink-2 uppercase">{label}</div>
        <h2 className="font-display-m mt-0.5 text-[1.625rem] leading-tight font-bold text-ink">{title}</h2>
      </div>
      {children}
      {footer}
    </section>
  )
}
