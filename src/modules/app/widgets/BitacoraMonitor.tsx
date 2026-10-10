import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, FileText, Mic, NotebookPen, Paperclip, type LucideIcon } from 'lucide-react'
import { Card, Chip, type Tone } from '../components'
import { useCaptureStats } from '@/lib/data'
import type { CaptureStatus, CaptureType } from '@/lib/types'

// `photo` es el tipo anterior a los archivos; se muestra igual que `file`.
const TYPE_ICON: Record<CaptureType, LucideIcon> = { text: FileText, voice: Mic, photo: Paperclip, file: Paperclip }
const TYPE_LABEL: Record<CaptureType, string> = { text: 'Texto', voice: 'Voz', photo: 'Archivo', file: 'Archivo' }
const SHOWN_TYPES: CaptureType[] = ['text', 'voice', 'file']
const STATUS_TONE: Record<CaptureStatus, Tone> = {
  borrador: 'amber',
  procesado: 'teal',
  archivado: 'neutral',
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const days = Math.round(hrs / 24)
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`
}

/** Mini dashboard con la visibilidad de las entradas de Bitácora y sus estados. */
export function BitacoraMonitor() {
  const { data: s, isLoading } = useCaptureStats()

  const processedPct = s && s.total > 0 ? Math.round((s.byStatus.procesado / s.total) * 100) : 0

  return (
    <>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[0.9375rem] font-semibold text-ink">
          <NotebookPen size={16} className="text-brand" /> Monitor de Bitácora
        </div>
        <Link to="/app/bitacora" className="text-[0.8125rem] font-semibold text-brand">
          Ver todo
        </Link>
      </div>

      {isLoading || !s ? (
        <Card className="p-5 text-center text-[0.875rem] text-ink-3">Cargando…</Card>
      ) : s.total === 0 && s.recent.length === 0 ? (
        <Link to="/app/bitacora">
          <Card className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper-2 text-ink-3">
              <NotebookPen size={20} />
            </div>
            <div className="flex-1 text-[0.875rem] text-ink-2">Aún no hay entradas — anotá la primera.</div>
            <ChevronRight size={18} className="text-ink-3" />
          </Card>
        </Link>
      ) : (
        <Card className="overflow-hidden">
          {/* Conteo por estado */}
          <div className="grid grid-cols-3 divide-x divide-hair">
            {(['borrador', 'procesado', 'archivado'] as CaptureStatus[]).map((st) => (
              <div key={st} className="px-3 py-3 text-center">
                <div className="tabular-nums text-[1.25rem] font-bold text-ink">{s.byStatus[st]}</div>
                <div className="mt-1 flex justify-center">
                  <Chip tone={STATUS_TONE[st]}>{st === 'borrador' ? 'Borradores' : st === 'procesado' ? 'Procesadas' : 'Archivadas'}</Chip>
                </div>
              </div>
            ))}
          </div>

          {/* Avance + tipos */}
          <div className="border-t border-hair px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between text-[0.8125rem] text-ink-2">
              <span>{processedPct}% procesado · últimos 30 días</span>
              <span className="flex items-center gap-2.5">
                {SHOWN_TYPES.map((t) => {
                  const Icon = TYPE_ICON[t]
                  const n = t === 'file' ? s.byType.file + s.byType.photo : s.byType[t]
                  return (
                    <span key={t} title={TYPE_LABEL[t]} className="flex items-center gap-1">
                      <Icon size={12} /> {n}
                    </span>
                  )
                })}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${processedPct}%` }} />
            </div>
          </div>

          {/* Alerta: borradores atrasados */}
          {s.staleDrafts > 0 && (
            <Link to="/app/bitacora" className="flex items-center gap-2 border-t border-warn-tint bg-warn-tint px-4 py-2.5 text-[0.8125rem] font-medium text-warn">
              <AlertTriangle size={14} className="shrink-0" />
              {s.staleDrafts} {s.staleDrafts === 1 ? 'borrador lleva' : 'borradores llevan'} más de 24 h sin confirmar
            </Link>
          )}

          {/* Últimas entradas */}
          <div className="divide-y divide-hair border-t border-hair">
            {s.recent.map((c) => {
              const Icon = TYPE_ICON[c.type]
              return (
                <Link key={c.id} to="/app/bitacora" className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-2 text-ink-2">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.875rem] text-ink">{c.raw_input || TYPE_LABEL[c.type]}</div>
                    <div className="text-[0.8125rem] text-ink-3">{timeAgo(c.created_at)}</div>
                  </div>
                  <Chip tone={STATUS_TONE[c.status]}>{c.status}</Chip>
                </Link>
              )
            })}
          </div>
        </Card>
      )}
    </>
  )
}
