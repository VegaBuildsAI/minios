import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useParseCapture, useUpdateCapture } from '@/lib/data'
import { formatCRC, type AiExtraction, type Capture, type CaptureCategory } from '@/lib/types'
import { ReceiveInvoice } from './ReceiveInvoice'

const TIPO_LABEL: Record<AiExtraction['tipo'], string> = {
  factura_proveedor: 'Factura de proveedor',
  recibo: 'Recibo',
  cierre_caja: 'Cierre de caja',
  comprobante_pago: 'Comprobante de pago',
  nota: 'Nota',
  otro: 'Documento',
}
const CAT_LABEL: Record<CaptureCategory, string> = { inventario: 'Inventario', caja: 'Caja', notas: 'Notas' }

const money = (n: number | null, moneda: string) => (n == null ? '—' : moneda === 'USD' ? `US$${n.toLocaleString('es-CR')}` : formatCRC(n))

function Confidence({ v }: { v: number | null }) {
  if (v == null) return null
  const [label, cls] = v >= 0.85 ? ['Confianza alta', 'bg-brand-tint text-ok'] : v >= 0.6 ? ['Confianza media', 'bg-warn-tint text-warn'] : ['Revisar con cuidado', 'bg-danger-tint text-danger']
  return <span className={`rounded-full px-2 py-0.5 text-[0.8125rem] font-semibold ${cls}`}>{label}</span>
}

/** Estado y resultado de la lectura con IA de un archivo de la Bitácora. */
export function AiDocPanel({ c }: { c: Capture }) {
  const parse = useParseCapture()
  const update = useUpdateCapture()
  const [open, setOpen] = useState(false)
  if (!c.file_path) return null

  if (c.ai_status === 'procesando') {
    return (
      <div className="mb-2 flex items-center gap-2 rounded-xl bg-brand-tint px-3 py-2 text-[0.8125rem] font-medium text-brand">
        <Loader2 size={14} className="animate-spin" /> Leyendo el documento con IA…
      </div>
    )
  }

  if (c.ai_status === 'error') {
    return (
      <div className="mb-2 rounded-xl bg-danger-tint px-3 py-2">
        <div className="flex items-start gap-2 text-[0.8125rem] text-danger">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{c.ai_error ?? 'No se pudo leer el documento.'}</span>
        </div>
        <button onClick={() => parse.mutate({ id: c.id, force: true })} className="mt-1.5 flex items-center gap-1 text-[0.8125rem] font-semibold text-danger">
          <RefreshCw size={12} /> Reintentar
        </button>
      </div>
    )
  }

  if (c.ai_status !== 'listo') {
    return (
      <button
        onClick={() => parse.mutate({ id: c.id })}
        className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand py-2 text-[0.8125rem] font-semibold text-brand"
      >
        <Sparkles size={14} /> Leer con IA
      </button>
    )
  }

  const ai = c.parsed_json?.ai
  if (!ai) return null
  const suggest = ai.categoria !== c.category ? ai.categoria : null

  return (
    <div className="mb-2 rounded-xl bg-brand-tint p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Sparkles size={14} className="text-brand" />
        <span className="text-[0.875rem] font-semibold text-ink">{TIPO_LABEL[ai.tipo] ?? 'Documento'}</span>
        <Confidence v={c.ai_confidence} />
      </div>
      <p className="text-[0.875rem] text-ink-2">{ai.resumen}</p>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[0.8125rem] text-ink-2">
        {ai.proveedor && <span className="col-span-2 truncate">Proveedor: <b className="text-ink">{ai.proveedor}</b></span>}
        {ai.fecha && <span>Fecha: <b className="text-ink">{ai.fecha}</b></span>}
        {ai.numero && <span className="truncate">N°: <b className="tabular-nums text-ink">{ai.numero}</b></span>}
        {ai.total != null && <span>Total: <b className="tabular-nums text-ink">{money(ai.total, ai.moneda)}</b></span>}
        {ai.lineas.length > 0 && <span>{ai.lineas.length} línea(s)</span>}
      </div>

      {ai.revisar.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-lg bg-warn-tint px-2.5 py-2 text-[0.8125rem] text-warn">
          {ai.revisar.map((r, i) => (
            <li key={i} className="flex gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {r}
            </li>
          ))}
        </ul>
      )}

      {suggest && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[0.8125rem] text-ink-2">
          <span>La IA lo ve como <b>{CAT_LABEL[suggest]}</b> (está en {CAT_LABEL[c.category]}).</span>
          <button onClick={() => update.mutate({ id: c.id, category: suggest })} className="shrink-0 font-semibold text-brand">
            Mover
          </button>
        </div>
      )}

      <button onClick={() => setOpen((v) => !v)} className="mt-2 flex items-center gap-1 text-[0.8125rem] font-semibold text-brand">
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {open ? 'Ocultar detalle' : 'Ver detalle y transcripción'}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {ai.lineas.length > 0 && (
            <div className="overflow-x-auto rounded-lg bg-white">
              <table className="w-full text-[0.8125rem]">
                <thead>
                  <tr className="text-left text-ink-3">
                    <th className="px-2 py-1 font-medium">Descripción</th>
                    <th className="px-1 py-1 text-right font-medium">Cant.</th>
                    <th className="px-1 py-1 text-right font-medium">Precio</th>
                    <th className="px-2 py-1 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ai.lineas.map((l, i) => (
                    <tr key={i} className="border-t border-hair text-ink">
                      <td className="px-2 py-1">{l.d}</td>
                      <td className="px-1 py-1 text-right tabular-nums">{l.c ?? '—'}</td>
                      <td className="px-1 py-1 text-right tabular-nums">{l.p ?? '—'}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{l.t ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(ai.subtotal != null || ai.iva != null) && (
            <div className="flex gap-4 text-[0.8125rem] text-ink-2">
              {ai.subtotal != null && <span>Subtotal {money(ai.subtotal, ai.moneda)}</span>}
              {ai.iva != null && <span>IVA {money(ai.iva, ai.moneda)}</span>}
            </div>
          )}
          {ai.texto && <p className="whitespace-pre-line rounded-lg bg-white px-2.5 py-2 text-[0.8125rem] text-ink-2">{ai.texto}</p>}
          <button
            onClick={() => parse.mutate({ id: c.id, force: true })}
            className="flex items-center gap-1 text-[0.8125rem] font-medium text-ink-3 hover:text-brand"
            title="Vuelve a leer el archivo (usa IA otra vez)"
          >
            <RefreshCw size={11} /> Volver a leer (usa IA)
          </button>
        </div>
      )}

      {ai.tipo === 'factura_proveedor' && ai.lineas.length > 0 && c.status !== 'archivado' && <ReceiveInvoice capture={c} />}
    </div>
  )
}
