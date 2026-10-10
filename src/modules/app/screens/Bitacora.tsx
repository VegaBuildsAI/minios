import { useRef, useState } from 'react'
import { Archive, Camera, Check, ExternalLink, FileText, Loader2, Mic, MicOff, NotebookPen, Paperclip, Send, Trash2 } from 'lucide-react'
import { Card, Chip, ScreenHeader } from '../components'
import {
  BITACORA_ACCEPT,
  uploadBitacoraFile,
  useCaptures,
  useCreateCapture,
  useBusinessSettings,
  useDeleteCapture,
  useParseCapture,
  useSignedUrl,
  useUpdateCapture,
} from '@/lib/data'
import { useAuth } from '@/modules/auth/context'
import { AiDocPanel } from '../widgets/AiDocPanel'
import type { Capture, CaptureCategory, CaptureType } from '@/lib/types'
import { fmtDateTime } from '@/lib/time'

type Tab = 'text' | 'voice' | 'file'

// Web Speech API (Chrome) — tipado mínimo
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onend: () => void
  start: () => void
  stop: () => void
}
function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

const TYPE_META: Record<CaptureType, { icon: typeof FileText; label: string }> = {
  text: { icon: FileText, label: 'Texto' },
  voice: { icon: Mic, label: 'Voz' },
  photo: { icon: Paperclip, label: 'Archivo' },
  file: { icon: Paperclip, label: 'Archivo' },
}

const CATEGORIES: { id: CaptureCategory; label: string; hint: string; cls: string }[] = [
  { id: 'inventario', label: 'Inventario', hint: 'Facturas de proveedor', cls: 'bg-brand-tint text-brand' },
  { id: 'caja', label: 'Caja', hint: 'Cierres, recibos', cls: 'bg-marigold-tint text-warn' },
  { id: 'notas', label: 'Notas', hint: 'Otros', cls: 'bg-paper-2 text-ink' },
]
const CATEGORY_CLS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.cls])) as Record<CaptureCategory, string>
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<CaptureCategory, string>

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/** Vista previa del archivo adjunto (el bucket es privado → URL firmada temporal). */
function FilePreview({ c }: { c: Capture }) {
  const { data: url, isLoading, isError } = useSignedUrl(c.file_path)
  if (!c.file_path) return null
  const isImage = (c.file_mime ?? '').startsWith('image/')
  const isPdf = c.file_mime === 'application/pdf'

  if (isImage && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mb-2 block">
        <img src={url} alt={c.file_name ?? 'archivo'} loading="lazy" className="max-h-44 w-full rounded-xl object-cover" />
      </a>
    )
  }
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl bg-paper px-3 py-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-tint text-danger">
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={20} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.875rem] font-medium text-ink">{c.file_name ?? 'Archivo'}</div>
        <div className="text-[0.8125rem] text-ink-3">
          {isPdf ? 'PDF' : 'Archivo'}
          {c.file_size ? ` · ${formatSize(c.file_size)}` : ''}
          {isError ? ' · no se pudo abrir' : ''}
        </div>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-white h-9 px-3.5 text-[0.875rem] font-semibold text-brand shadow-sm">
          Abrir <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}

export function Bitacora() {
  const { profile } = useAuth()
  const canDelete = profile?.role === 'owner' || profile?.role === 'superadmin'
  const { data: captures = [] } = useCaptures()
  const create = useCreateCapture()
  const update = useUpdateCapture()
  const remove = useDeleteCapture()
  const parse = useParseCapture()
  const { data: settings } = useBusinessSettings()

  const [tab, setTab] = useState<Tab>('text')
  const [category, setCategory] = useState<CaptureCategory>('notas')
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)
  const uploading = progress !== null

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = getRecognition()
    if (!rec) {
      alert('Tu navegador no soporta dictado por voz. Usá Chrome o escribí el texto.')
      return
    }
    rec.lang = 'es-CR'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
      setText(t)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const saveText = async (type: CaptureType) => {
    if (!text.trim()) return
    await create.mutateAsync({ type, rawInput: text.trim(), category })
    setText('')
  }

  // Sube uno o varios archivos; cada uno queda como una entrada en borrador.
  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    const errs: string[] = []
    setErrors([])
    for (let i = 0; i < list.length; i++) {
      setProgress({ done: i, total: list.length })
      try {
        const file = await uploadBitacoraFile(list[i])
        const id = await create.mutateAsync({ type: 'file', rawInput: text.trim() || list[i].name, category, file })
        // La lectura con IA corre en segundo plano; el estado se ve en la entrada.
        if (settings?.ai_enabled !== false) parse.mutate({ id })
      } catch (err) {
        errs.push((err as Error).message)
      }
    }
    setProgress(null)
    setErrors(errs)
    if (errs.length < list.length) setText('')
    if (cameraRef.current) cameraRef.current.value = ''
    if (pickerRef.current) pickerRef.current.value = ''
  }

  return (
    <div>
      <ScreenHeader title="Bitácora" subtitle="Anotá rápido o subí facturas y recibos: queda todo en un solo lugar." />

      {/* Capture card */}
      <Card className="mb-5 p-4">
        <div className="mb-3 flex gap-1.5">
          {(['text', 'voice', 'file'] as Tab[]).map((t) => {
            const M = TYPE_META[t]
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[0.875rem] font-semibold ${
                  tab === t ? 'border-ink bg-ink text-white' : 'border-hair-strong bg-white text-ink'
                }`}
              >
                <M.icon size={18} aria-hidden="true" /> {M.label}
              </button>
            )
          })}
        </div>

        {/* Categoría: de qué parte del negocio es */}
        <div className="mb-3">
          <div className="mb-1.5 text-[0.75rem] font-bold tracking-[0.06em] text-ink-2 uppercase">¿De qué es?</div>
          <div className="flex gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                title={c.hint}
                aria-pressed={category === c.id}
                className={`h-10 flex-1 rounded-full border px-2 text-[0.875rem] font-semibold transition-colors ${
                  category === c.id ? `${c.cls} border-current` : 'border-hair-strong bg-white text-ink-2'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'voice' && (
          <div className="mb-3 flex flex-col items-center py-2">
            <button
              onClick={toggleVoice}
              aria-label={listening ? 'Parar dictado' : 'Dictar'}
              className={`flex h-16 w-16 items-center justify-center rounded-full ${listening ? 'bg-danger text-white' : 'bg-ink text-marigold'}`}
            >
              {listening ? <MicOff size={26} /> : <Mic size={26} />}
            </button>
            <span className="mt-2 text-[0.8125rem] text-ink-2">{listening ? 'Escuchando… tocá para parar' : 'Tocá para dictar'}</span>
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={tab === 'text' ? 3 : 2}
          placeholder={
            tab === 'file' ? 'Nota opcional para el archivo (ej. Factura Dos Pinos #1234)…' : tab === 'voice' ? 'El dictado aparecerá aquí…' : 'Ej: Llegaron 20 bolsas de azúcar…'
          }
          aria-label="Texto de la entrada"
          className="w-full resize-none rounded-[14px] border border-hair-strong bg-white p-3 text-ink outline-none placeholder:text-ink-3 focus:border-brand"
        />

        {/* Cámara directa (capture) y selector de archivos (galería / PDF / varios) */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFiles(e.target.files)} className="hidden" />
        <input ref={pickerRef} type="file" accept={BITACORA_ACCEPT} multiple onChange={(e) => onFiles(e.target.files)} className="hidden" />

        <div className="mt-3">
          {tab === 'file' ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => cameraRef.current?.click()}
                  disabled={uploading}
                  className="flex flex-1 items-center justify-center gap-2 h-12 rounded-[14px] border border-hair-strong bg-white text-[0.9375rem] text-ink font-semibold text-brand disabled:opacity-60"
                >
                  <Camera size={17} /> Tomar foto
                </button>
                <button
                  onClick={() => pickerRef.current?.click()}
                  disabled={uploading}
                  className="flex flex-1 items-center justify-center gap-2 h-12 rounded-[14px] bg-brand text-[0.9375rem] font-semibold text-white disabled:opacity-60"
                >
                  {uploading ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}
                  {uploading ? `Subiendo ${progress.done + 1}/${progress.total}…` : 'Elegir archivos'}
                </button>
              </div>
              <p className="mt-2 text-center text-[0.8125rem] text-ink-3">JPG, PNG, WebP o PDF · máx. 10 MB · se pueden elegir varios</p>
              {errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 rounded-xl bg-danger-tint px-3 py-2 text-[0.8125rem] text-danger">
                  {errors.map((er, i) => (
                    <li key={i}>• {er}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <button
              onClick={() => saveText(tab)}
              disabled={create.isPending || !text.trim()}
              className="flex w-full items-center justify-center gap-2 h-12 rounded-[14px] bg-brand text-[0.9375rem] font-bold text-white disabled:opacity-50"
            >
              <Send size={16} /> Guardar borrador
            </button>
          )}
        </div>
      </Card>

      {/* Captures list */}
      <div className="mb-2 flex items-center gap-2 px-0.5 text-base font-bold text-ink">
        <NotebookPen size={16} className="text-brand" /> Entradas
      </div>
      {captures.length === 0 ? (
        <Card className="p-6 text-center text-[0.875rem] text-ink-3">Aún no hay entradas. Anotá la primera arriba.</Card>
      ) : (
        <div className="space-y-2.5">
          {captures.map((c) => {
            const M = TYPE_META[c.type]
            return (
              <Card key={c.id} className="p-3.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-tint text-brand">
                    <M.icon size={16} aria-hidden="true" />
                  </span>
                  <span className="text-[0.8125rem] text-ink-3">
                    {fmtDateTime(c.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[0.8125rem] font-semibold ${CATEGORY_CLS[c.category] ?? CATEGORY_CLS.notas}`}>
                    {CATEGORY_LABEL[c.category] ?? 'Notas'}
                  </span>
                  <span className="ml-auto">
                    <Chip tone={c.status === 'procesado' ? 'brand' : c.status === 'archivado' ? 'neutral' : 'amber'}>
                      {c.status === 'procesado' ? 'Procesado' : c.status === 'archivado' ? 'Archivado' : 'Por revisar'}
                    </Chip>
                  </span>
                </div>
                <FilePreview c={c} />
                <AiDocPanel c={c} />
                {/* En archivos sin nota, raw_input repite el nombre; evitar mostrarlo dos veces */}
                {c.raw_input && c.raw_input !== c.file_name && <p className="text-[0.9375rem] text-ink">{c.raw_input}</p>}
                {c.status === 'borrador' && (
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => update.mutate({ id: c.id, status: 'procesado' })}
                      className="flex flex-1 items-center justify-center gap-1.5 h-11 rounded-xl bg-brand text-[0.875rem] font-bold text-white"
                    >
                      <Check size={14} /> Confirmar
                    </button>
                    <button
                      onClick={() => update.mutate({ id: c.id, status: 'archivado' })}
                      className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-hair-strong bg-white px-3 text-[0.875rem] font-semibold text-ink-2"
                    >
                      <Archive size={14} /> Archivar
                    </button>
                  </div>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      if (window.confirm('¿Eliminar esta entrada' + (c.file_path ? ' y su archivo' : '') + '? No se puede deshacer.')) remove.mutate(c)
                    }}
                    className="mt-1 flex h-10 items-center gap-1.5 text-[0.8125rem] font-medium text-ink-2 hover:text-danger"
                  >
                    <Trash2 size={14} aria-hidden="true" /> Eliminar
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
