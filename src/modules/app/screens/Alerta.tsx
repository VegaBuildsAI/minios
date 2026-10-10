import { useNavigate } from 'react-router-dom'
import { AlertOctagon, AlertTriangle, ArrowRight, Bot, CheckCircle2, Eye, FileText, Truck } from 'lucide-react'
import type { Severity } from '@/lib/insights'
import { Card, Chip, ScreenHeader } from '../components'
import { useInsights } from '@/lib/insights'

function SeverityIcon({ severity, size = 20 }: { severity: Severity; size?: number }) {
  if (severity === 'critico') return <AlertOctagon size={size} className="text-danger" aria-label="Crítico" />
  return <AlertTriangle size={size} className="text-warn" aria-label="Aviso" />
}

export function Alerta() {
  const navigate = useNavigate()
  const { insights, summary } = useInsights()
  const top = insights[0]
  const isOk = !top || top.severity === 'ok'

  if (isOk) {
    return (
      <div>
        <ScreenHeader title="Alertas" subtitle={summary} />
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-brand">
            <CheckCircle2 size={34} />
          </div>
          <div className="text-[1rem] font-bold text-ink">Todo en orden</div>
          <p className="text-[0.9375rem] text-ink-2">Sin alertas de inventario ni de margen en este momento.</p>
        </Card>
      </div>
    )
  }

  const timeline = [
    { icon: <Bot size={16} />, title: 'Asistente IA', desc: `Detecta: ${top.title}`, done: true },
    { icon: <FileText size={16} />, title: 'Resumen del caso', desc: 'Organiza inventario, consumo y proveedor', done: true },
    { icon: <Truck size={16} />, title: 'Sugerencia', desc: top.detail, done: true },
    { icon: <Eye size={16} />, title: 'Esperando tu decisión', desc: 'Vos decidís si se actúa', done: false },
  ]

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-display-m text-[1.625rem] leading-tight font-bold text-ink">Alerta activa</h1>
          <p className="text-[0.9375rem] text-ink-2">{insights.filter((i) => i.severity !== 'ok').length} alertas detectadas</p>
        </div>
        <Chip tone={top.severity === 'critico' ? 'rose' : 'amber'}>{top.severity === 'critico' ? 'Crítico' : 'Aviso'}</Chip>
      </div>

      <Card className="mb-4 p-4">
        <div className="relative flex flex-col gap-4 pl-1">
          {timeline.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${s.done ? 'bg-brand-tint text-brand' : 'bg-paper-2 text-ink-3'}`}>
                  {s.icon}
                </span>
                {i < timeline.length - 1 && <span className="my-1 w-0.5 flex-1 bg-paper-2" />}
              </div>
              <div className="flex-1 pb-1">
                <div className="text-[0.9375rem] font-semibold text-ink">{s.title}</div>
                <div className="text-[0.8125rem] text-ink-2">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-2 flex items-center gap-2 px-0.5 text-base font-bold text-ink">
        <FileText size={16} className="text-brand" /> Resumen del caso
      </div>
      <Card className="mb-4 p-4">
        <div className="mb-2 flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${top.severity === 'critico' ? 'bg-danger-tint' : 'bg-warn-tint'}`}>
            <SeverityIcon severity={top.severity} size={22} />
          </div>
          <div>
            <div className="text-base font-semibold text-ink">{top.title}</div>
            {top.supplier && <div className="text-[0.8125rem] text-ink-2">Proveedor: {top.supplier}</div>}
          </div>
        </div>
        <blockquote className="rounded-xl bg-paper px-3 py-2.5 text-[0.9375rem] text-ink-2">{top.detail}</blockquote>
        <button
          onClick={() => navigate('/app/proveedores')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-[0.9375rem] font-semibold text-white shadow-sm hover:bg-brand-dark"
        >
          Ir a Proveedores <ArrowRight size={17} />
        </button>
      </Card>

      {insights.filter((i) => i.severity !== 'ok').length > 1 && (
        <>
          <h2 className="mb-2 px-0.5 text-base font-bold text-ink">Otras alertas</h2>
          <Card className="divide-y divide-hair">
            {insights.filter((i) => i.severity !== 'ok').slice(1).map((ins) => (
              <div key={ins.id} className="flex items-center gap-3 px-4 py-3">
                <SeverityIcon severity={ins.severity} />
                <div className="flex-1">
                  <div className="text-[0.875rem] font-semibold text-ink">{ins.title}</div>
                  <div className="text-[0.8125rem] text-ink-2">{ins.detail}</div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <p className="mt-4 pb-2 text-center text-[0.9375rem] italic text-ink-2">La IA acompaña. Vos decidís.</p>
    </div>
  )
}
