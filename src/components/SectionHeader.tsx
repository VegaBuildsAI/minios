interface SectionHeaderProps {
  label: string
  title: React.ReactNode
  desc?: string
}

export function SectionHeader({ label, title, desc }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <div className="mb-3 inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-fg-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-orange" />
        {label}
      </div>
      <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-fg sm:text-3xl">
        {title}
      </h2>
      {desc && <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-fg-secondary">{desc}</p>}
    </div>
  )
}
