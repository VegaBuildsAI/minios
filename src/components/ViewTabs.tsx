interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface ViewTabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function ViewTabs({ tabs, active, onChange }: ViewTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-[0.8rem] font-medium transition-colors ${
              isActive
                ? 'border-orange text-orange'
                : 'border-transparent text-fg-muted hover:text-fg-secondary'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
