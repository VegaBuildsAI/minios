import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCheck, FileText, Mic, Send, Sparkles, Square, X } from 'lucide-react'
import { askAssistant, useCaptureStats, useDashboardStats, useProducts } from '@/lib/data'
import { formatCRC, type Product, type Proposal } from '@/lib/types'
import { useAuth } from '@/modules/auth/context'
import { ProposalCard } from '../widgets/ProposalCard'
import type { DashboardStats } from '@/lib/data'
import { fmtTime } from '@/lib/time'

interface Msg {
  role: 'bot' | 'user'
  text: string
  time: string
  proposals?: Proposal[]
  error?: boolean
}

function now() {
  return fmtTime(new Date())
}

/**
 * Atajo local de costo cero: saludos, resumen del día y agotados salen de datos ya cargados,
 * sin llamar a la IA. Todo lo demás va al asistente.
 */
function localAnswer(q: string, products: Product[], stats?: DashboardStats): string | null {
  const t = q.toLowerCase().trim()
  if (/^(hola|buenas|buenos días|buenos dias|hey)\b/.test(t) && t.length < 20) {
    return '¡Hola! Preguntame por el inventario, las ventas, los documentos de la Bitácora o qué pedir.'
  }
  if (/^(resumen( del d[ií]a)?|c[oó]mo va (el d[ií]a|todo))\??$/.test(t) && stats) {
    return `Hoy llevás ${formatCRC(stats.salesTodayTotal)} en ${stats.salesTodayCount} ventas. ${
      stats.criticalCount > 0 ? `Hay ${stats.criticalCount} productos en inventario crítico.` : 'No hay inventario crítico.'
    }`
  }
  if (/^(qu[eé] (est[aá]|hay) agotado|agotados?)\??$/.test(t)) {
    const out = products.filter((p) => p.stock_qty <= 0)
    return out.length ? 'Agotados:\n' + out.map((p) => `• ${p.name}`).join('\n') : 'No hay productos agotados.'
  }
  return null
}

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

export function Assistant() {
  const navigate = useNavigate()
  const { data: products = [] } = useProducts()
  const { data: stats } = useDashboardStats()
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: '¡Hola! Soy tu asistente de MiniOS. Preguntame por el inventario, las ventas, los documentos de la Bitácora o qué pedir.', time: now() },
  ])
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const cancelVoiceRef = useRef(false)
  const { profile } = useAuth()
  const firstName = (profile?.full_name || 'Michael').split(' ')[0]
  const { data: captureStats } = useCaptureStats()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, busy])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    const userMsg: Msg = { role: 'user', text: q, time: now() }
    const local = localAnswer(q, products, stats)
    if (local) {
      setMsgs((m) => [...m, userMsg, { role: 'bot', text: local, time: now() }])
      return
    }
    setMsgs((m) => [...m, userMsg])
    setBusy(true)
    try {
      // Solo viajan los últimos turnos de texto (menos tokens); el servidor recorta de nuevo.
      const history = [...msgs, userMsg]
        .filter((m) => !m.error)
        .slice(-8)
        .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), content: m.text }))
      while (history.length && history[0].role !== 'user') history.shift()
      const r = await askAssistant(history)
      setMsgs((m) => [...m, { role: 'bot', text: r.reply, time: now(), proposals: r.proposals }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'bot', text: (e as Error).message, time: now(), error: true }])
    } finally {
      setBusy(false)
    }
  }

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = getRecognition()
    if (!rec) {
      alert('Tu navegador no soporta dictado. Usá Chrome o escribí tu pregunta.')
      return
    }
    rec.lang = 'es-CR'
    rec.interimResults = true
    rec.continuous = false
    let final = ''
    rec.onresult = (e) => {
      let tx = ''
      for (let i = 0; i < e.results.length; i++) tx += e.results[i][0].transcript
      final = tx
      setInput(tx)
    }
    rec.onend = () => {
      setListening(false)
      if (cancelVoiceRef.current) {
        cancelVoiceRef.current = false
        setInput('')
        return
      }
      if (final.trim()) send(final)
    }
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const CAPS: { tag: string; q: string }[] = [
    { tag: 'Inventario', q: '¿Cuánto hay de arroz?' },
    { tag: 'Ventas', q: 'Resumen del día' },
    { tag: 'Pedidos', q: '¿Qué conviene pedir?' },
    { tag: 'Documentos', q: '¿Qué facturas subí esta semana?' },
  ]
  const fresh = msgs.length <= 1
  const pending = captureStats?.byStatus.borrador ?? 0

  return (
    <div className="mostrador fixed inset-0 z-50 mx-auto flex max-w-[440px] flex-col bg-paper">
      <header className="flex items-center gap-2.5 border-b border-hair bg-white px-3 py-3">
        <button onClick={() => navigate('/app')} aria-label="Cerrar asistente" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-paper-2">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display-m text-[1.375rem] leading-tight font-bold text-ink">Asistente</h1>
          <div className="truncate text-[0.8125rem] text-ink-2">Consulta tus datos · vos confirmás cada acción</div>
        </div>
      </header>

      <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4" aria-live="polite">
        {fresh && (
          <div className="pb-1">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-ink text-marigold">
              <Sparkles size={26} aria-hidden="true" />
            </span>
            <h2 className="font-display-m mt-3.5 text-[1.75rem] leading-[1.12] font-bold text-ink">¿En qué te ayudo, {firstName}?</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">
              Consulto tu inventario, ventas, proveedores y documentos. Yo propongo; vos confirmás antes de que cambie algo.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {CAPS.map((c) => (
                <button
                  key={c.q}
                  onClick={() => send(c.q)}
                  className="flex min-h-[104px] flex-col justify-between gap-2.5 rounded-[18px] border border-hair bg-white p-3.5 text-left"
                >
                  <span className="text-[0.75rem] font-bold tracking-[0.06em] text-brand uppercase">{c.tag}</span>
                  <span className="text-[0.9375rem] leading-snug font-semibold text-ink">{c.q}</span>
                </button>
              ))}
            </div>
            {pending > 0 && (
              <button
                onClick={() => navigate('/app/bitacora')}
                className="mt-3 flex w-full items-center gap-3 rounded-[18px] border border-hair bg-white p-3.5 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn-tint text-warn">
                  <FileText size={20} aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-[0.9375rem] font-semibold text-ink">
                    {pending} {pending === 1 ? 'entrada espera' : 'entradas esperan'} tu revisión
                  </span>
                  <span className="block text-[0.8125rem] text-ink-2">En la Bitácora</span>
                </span>
                <span className="flex h-10 items-center rounded-xl bg-brand-tint px-3.5 text-[0.875rem] font-bold text-brand">Revisar</span>
              </button>
            )}
          </div>
        )}

        {msgs.map((m, i) =>
          fresh && i === 0 ? null : m.role === 'bot' ? (
            <div key={i} className="max-w-[92%]">
              <div className="mb-1 flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.06em] text-brand uppercase">
                <Sparkles size={14} aria-hidden="true" /> Asistente · {m.time}
              </div>
              <div
                className={`rounded-[18px] rounded-bl-[4px] border px-3.5 py-3 text-base leading-relaxed whitespace-pre-line ${
                  m.error ? 'border-danger-tint bg-danger-tint text-danger' : 'border-hair bg-white text-ink'
                }`}
              >
                {m.text}
              </div>
              {m.proposals?.map((p) => (
                <ProposalCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div key={i} className="flex flex-col items-end">
              <div className="max-w-[80%] rounded-[18px] rounded-br-[4px] bg-ink px-3.5 py-3 text-base leading-relaxed whitespace-pre-line text-white">
                {m.text}
              </div>
              <div className="mt-1 flex items-center gap-1 pr-1 text-[0.75rem] text-ink-2">
                {m.time} <CheckCheck size={13} className="text-brand" aria-hidden="true" />
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex w-fit gap-1 rounded-[18px] rounded-bl-[4px] border border-hair bg-white px-4 py-3.5" aria-label="El asistente está pensando">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Entrada: texto o voz */}
      <div className="flex items-center gap-2.5 border-t border-hair bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <label className="flex h-12 min-w-0 flex-1 items-center rounded-full bg-paper px-4">
          <span className="sr-only">Escribí tu pregunta</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Escribí o tocá el micrófono"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
          />
        </label>
        {input.trim() && !listening ? (
          <button onClick={() => send(input)} disabled={busy} aria-label="Enviar" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-50">
            <Send size={22} aria-hidden="true" />
          </button>
        ) : (
          <button onClick={toggleVoice} aria-label="Hablar con el asistente" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-marigold">
            <Mic size={24} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Modo escucha (pantalla completa) */}
      {listening && (
        <div className="absolute inset-0 z-20 flex flex-col bg-ink text-paper" role="dialog" aria-label="Escuchando">
          <div className="flex items-center px-4 py-3.5">
            <button
              onClick={() => {
                cancelVoiceRef.current = true
                recRef.current?.stop()
              }}
              aria-label="Cancelar"
              className="flex h-11 w-11 items-center justify-center rounded-full text-paper"
            >
              <X size={22} aria-hidden="true" />
            </button>
            <div className="flex-1 text-center text-[0.875rem] font-semibold text-[#b9bfb9]">Español (Costa Rica)</div>
            <div className="w-11" />
          </div>
          <div className="flex flex-1 flex-col gap-5 px-7 pt-10">
            <div className="flex items-center gap-2 text-[0.8125rem] font-bold tracking-[0.08em] text-marigold uppercase">
              <span className="h-2 w-2 rounded-full bg-marigold" /> Escuchando
            </div>
            <p aria-live="polite" className="font-display-m text-[2rem] leading-[1.2] font-semibold text-white">
              {input || 'Decí tu pregunta…'}
            </p>
            <p className="text-[0.9375rem] leading-relaxed text-[#b9bfb9]">Cuando dejés de hablar envío la pregunta.</p>
          </div>
          <div className="flex h-[120px] items-center justify-center gap-1.5" aria-hidden="true">
            {[18, 30, 46, 64, 80, 96, 72, 104, 84, 60, 92, 56, 38, 26, 16].map((h, i) => (
              <span
                key={i}
                className="w-1.5 origin-center animate-pulse rounded-full"
                style={{ height: h, background: i > 3 && i < 11 ? 'var(--m-marigold)' : '#5e665f', animationDelay: `${i * 0.07}s` }}
              />
            ))}
          </div>
          <div className="flex justify-center px-6 pt-6 pb-[max(env(safe-area-inset-bottom),2.5rem)]">
            <button
              onClick={() => recRef.current?.stop()}
              aria-label="Terminar y enviar"
              className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-marigold text-ink shadow-[0_0_0_10px_rgba(245,184,61,0.18),0_0_0_22px_rgba(245,184,61,0.08)]"
            >
              <Square size={26} fill="currentColor" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
