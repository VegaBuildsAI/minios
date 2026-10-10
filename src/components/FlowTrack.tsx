import type { FlowDef } from '@/config/solution-map'
import { accentVars } from '@/lib/accent'

export function FlowTrack({ flow }: { flow: FlowDef }) {
  return (
    <div style={accentVars(flow.accent)} className="rounded-[var(--radius-lg)] border border-line bg-card p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 className="text-[0.95rem] font-bold text-fg">{flow.name}</h3>
        <span
          className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold"
          style={{ color: 'var(--a)', background: 'var(--a-dim)' }}
        >
          {flow.trigger}
        </span>
      </div>
      <div className="mt-4 flex gap-0 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {flow.steps.map((step, i) => (
          <div key={step.title} className="relative flex w-[130px] flex-shrink-0 flex-col items-center px-1 text-center">
            {i < flow.steps.length - 1 && (
              <span
                className="absolute top-6 h-0.5"
                style={{
                  left: 'calc(50% + 24px)',
                  width: 'calc(100% - 48px)',
                  background: 'linear-gradient(90deg, var(--a), color-mix(in srgb, var(--a) 30%, transparent))',
                }}
              />
            )}
            <div
              className="relative z-[1] mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-card text-lg"
              style={{ border: '2px solid color-mix(in srgb, var(--a) 45%, transparent)' }}
            >
              {step.icon}
            </div>
            <div className="text-[0.78rem] font-bold text-fg">{step.title}</div>
            <div className="mt-0.5 text-[0.68rem] leading-snug text-fg-muted">{step.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
