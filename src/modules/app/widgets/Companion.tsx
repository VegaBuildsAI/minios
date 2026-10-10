import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Loader2, MessageCircle, Send } from 'lucide-react'
import { useBriefing, useCompanion, type BotMessage, type Mood } from '@/lib/companion'
import { askAssistant, type BriefingScreen } from '@/lib/data'
import type { DaySlot } from '@/lib/greeting'
import { fmtTime } from '@/lib/time'
import type { Proposal } from '@/lib/types'
import { MiniBot } from './MiniBot'
import { ProposalCard } from './ProposalCard'

const IDLE_MS = 25_000
const SCREEN: Record<BriefingScreen, string> = {
  caja: '/app/caja',
  inventario: '/app/inventario',
  proveedores: '/app/proveedores',
  bitacora: '/app/bitacora',
  ventas: '/app/ventas',
  reportes: '/app/reports',
  asistente: '/app/assistant',
  alerta: '/app/alerta',
}
const DEFAULT_ASK = ['¿Qué pido hoy?', '¿Cómo van las ventas?', '¿Qué se está agotando?']

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Escribe `text` letra por letra (una vez por `key`); con «reducir movimiento», de una vez. */
function useTyped(text: string, key: string, delay: number, speed: number) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (reducedMotion()) {
      setN(text.length)
      return
    }
    setN(0)
    let i = 0
    let iv: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      iv = setInterval(() => {
        i += 2
        setN(Math.min(i, text.length))
        if (i >= text.length && iv) clearInterval(iv)
      }, speed)
    }, delay)
    return () => {
      clearTimeout(start)
      if (iv) clearInterval(iv)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { shown: text.slice(0, n), done: n >= text.length }
}

interface Turn {
  q: string
  a?: string
  proposals?: Proposal[]
  error?: boolean
}

/**
 * «Mini», el agente del Inicio. Al entrar cuenta el estado real del abastecedor
 * (redactado por la IA con datos de Supabase; avisos locales si la IA no está), y se le
 * puede preguntar ahí mismo: responde con datos reales y propone acciones que el usuario
 * confirma. Su ánimo cambia con lo que dice y con lo que hace el usuario.
 */
export function Companion({ goal, slot, intro }: { goal: number; slot: DaySlot; intro: boolean }) {
  const { messages: local, loading: localLoading } = useCompanion(goal, slot)
  const { briefing, loading: briefLoading, error: briefError, at, aiOff } = useBriefing(goal, slot)
  // El índice se reinicia solo cuando cambia lo que redactó la IA (se muestra primero).
  const [cursor, setCursor] = useState({ k: '', i: 0 })
  const [turns, setTurns] = useState<Turn[]>([])
  const [mode, setMode] = useState<'brief' | 'chat'>('brief')
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const [react, setReact] = useState<Mood | null>(null)
  const [asleep, setAsleep] = useState(false)
  const [seen, setSeen] = useState(0)
  const reactTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Avisos: primero lo que redactó la IA; después los avisos locales que no repiten lo mismo.
  const ai: BotMessage | null = briefing ? { id: `ai:${briefing.titulo}`, title: briefing.titulo, text: briefing.mensaje, to: SCREEN[briefing.ir_a] ?? '/app/assistant', mood: briefing.mood } : null
  const notices: BotMessage[] = ai ? [ai, ...local.filter((m) => m.id !== 'ok' && m.id !== 'ask' && m.id !== 'summary')] : local
  const briefKey = ai?.id ?? 'local'
  const idx = cursor.k === briefKey ? Math.min(cursor.i, notices.length - 1) : 0
  const notice = notices[idx]
  const last = turns[turns.length - 1]
  const chatting = mode === 'chat' && !!last

  const speech = chatting
    ? asking
      ? { key: `q:${turns.length}`, title: 'Dejame revisar…', text: 'Estoy consultando tus datos.', to: '/app/assistant' }
      : { key: `a:${turns.length}`, title: '', text: last.a ?? '', to: '/app/assistant' }
    : { key: `${notice.id}:${seen}`, title: notice.title, text: notice.text, to: notice.to }

  const first = intro && seen === 0 && !chatting
  const full = speech.title ? `${speech.title} ${speech.text}` : speech.text
  const typed = useTyped(full, speech.key, first ? 1100 : 100, first ? 26 : 14)
  const titleShown = speech.title ? typed.shown.slice(0, speech.title.length) : ''
  const textShown = speech.title ? typed.shown.slice(speech.title.length + 1) : typed.shown

  const flash = (m: Mood, ms = 900) => {
    setReact(m)
    clearTimeout(reactTimer.current)
    reactTimer.current = setTimeout(() => setReact(null), ms)
  }

  // Se duerme sin interacción; cualquier toque lo despierta contento.
  useEffect(() => {
    let t = setTimeout(() => setAsleep(true), IDLE_MS)
    const wake = () => {
      clearTimeout(t)
      setAsleep((was) => {
        if (was) flash('excited', 1400)
        return false
      })
      t = setTimeout(() => setAsleep(true), IDLE_MS)
    }
    document.addEventListener('pointerdown', wake)
    document.addEventListener('keydown', wake)
    return () => {
      clearTimeout(t)
      clearTimeout(reactTimer.current)
      document.removeEventListener('pointerdown', wake)
      document.removeEventListener('keydown', wake)
    }
  }, [])

  const baseMood: Mood = chatting
    ? asking
      ? 'thinking'
      : last.error
        ? 'worried'
        : last.proposals?.length
          ? 'excited'
          : 'happy'
    : localLoading || (briefLoading && !briefing)
      ? 'thinking'
      : notice.mood
  const mood: Mood = react ?? (asleep && !asking ? 'sleepy' : baseMood)

  const tapBot = () => {
    if (chatting) {
      setMode('brief')
      flash('wink')
      return
    }
    flash(notices.length > 1 ? 'wink' : 'excited')
    setCursor({ k: briefKey, i: (idx + 1) % notices.length })
    setSeen((s) => s + 1)
  }

  const ask = async (q: string) => {
    const text = q.trim()
    if (!text || asking) return
    setInput('')
    setMode('chat')
    const history = [...turns.flatMap((t) => (t.a ? [{ role: 'user' as const, content: t.q }, { role: 'assistant' as const, content: t.a }] : [])), { role: 'user' as const, content: text }]
    setTurns((ts) => [...ts, { q: text }])
    setAsking(true)
    try {
      const r = await askAssistant(history.slice(-8))
      setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? { ...t, a: r.reply, proposals: r.proposals } : t)))
    } catch (e) {
      setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? { ...t, a: (e as Error).message || 'No pude consultar ahora. Probá de nuevo.', error: true } : t)))
    } finally {
      setAsking(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void ask(input)
  }

  const status = asking
    ? 'consultando tus datos…'
    : aiOff
      ? 'IA apagada · avisos de hoy'
      : briefLoading && !briefing
        ? 'leyendo tu tienda…'
        : briefError && !briefing
          ? 'sin IA por ahora · avisos de hoy'
          : briefing && at
            ? `leyó tu tienda a las ${fmtTime(new Date(at))}`
            : 'en línea'
  const chips = (briefing?.sugerencias?.length ? briefing.sugerencias : DEFAULT_ASK).filter((c) => !turns.some((t) => t.q === c))
  const enter = intro ? 'bubble-pop' : 'intro-soft'

  return (
    <section
      aria-label="Mini, tu asistente"
      className={`rounded-[26px] border border-[#cfe3da] bg-gradient-to-b from-[#e3f1ea] to-white p-3.5 shadow-[0_14px_36px_-24px_rgba(14,90,71,0.55)] ${intro ? 'intro-rise' : 'intro-soft'}`}
      style={{ ['--d' as string]: '300ms' }}
    >
      <div className="flex items-start gap-1.5">
        <div className="-mt-2 -ml-2 shrink-0">
          <MiniBot
            mood={mood}
            intro={intro}
            size={108}
            reacting={react === 'wink' || react === 'excited'}
            onClick={tapBot}
            label={chatting ? 'Mini. Tocá para volver a los avisos' : notices.length > 1 ? `Mini. Tocá para el siguiente aviso (${idx + 1} de ${notices.length})` : 'Mini, tu asistente'}
          />
        </div>

        <div className={`relative min-w-0 flex-1 rounded-[18px] border border-[#d6e7de] bg-white p-3 ${enter}`} style={{ ['--d' as string]: intro ? '900ms' : '0ms' }}>
          {/* Cola del globo hacia Mini */}
          <span aria-hidden="true" className="absolute top-6 -left-[7px] h-3.5 w-3.5 rotate-45 rounded-[3px] border-b border-l border-[#d6e7de] bg-white" />
          <div className="mb-1 flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.06em] text-brand uppercase">
            {(asking || (briefLoading && !briefing)) && <Loader2 size={11} className="animate-spin" aria-hidden="true" />}
            Mini · {status}
          </div>
          {chatting && <p className="mb-1 line-clamp-2 text-[0.8125rem] text-ink-3 italic">Vos: «{last.q}»</p>}

          <span className="sr-only" aria-live="polite">
            {speech.title ? `${speech.title}${/[.!?…]$/.test(speech.title) ? '' : '.'} ` : ''}
            {speech.text}
          </span>
          <div aria-hidden="true">
            {speech.title && (
              <p className="text-[1rem] leading-snug font-bold text-ink">
                {titleShown}
                {!typed.done && typed.shown.length <= speech.title.length && <span className="type-caret" />}
              </p>
            )}
            <p className={`${speech.title ? 'mt-0.5 text-[0.875rem] text-ink-2' : 'text-[0.9375rem] text-ink'} leading-snug whitespace-pre-line`}>
              {textShown}
              {!typed.done && typed.shown.length > speech.title.length && <span className="type-caret" />}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            {!chatting && notices.length > 1 ? (
              <span className="flex gap-1" aria-hidden="true">
                {notices.map((m, i) => (
                  <span key={m.id} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-brand' : 'w-1.5 bg-[#b9d6c8]'}`} />
                ))}
              </span>
            ) : (
              <span />
            )}
            <Link
              to={speech.to}
              onClick={() => flash('excited')}
              className="flex h-9 items-center gap-0.5 rounded-full bg-brand-tint pr-2 pl-3 text-[0.8125rem] font-bold text-brand"
            >
              {chatting ? 'Abrir chat' : 'Ver'} <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {chatting && !asking && last.proposals?.map((p) => <ProposalCard key={p.id} p={p} />)}

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Preguntas sugeridas">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => void ask(c)}
              disabled={asking}
              className="h-9 rounded-full border border-[#cfe3da] bg-white px-3 text-[0.8125rem] font-semibold text-ink hover:border-brand disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-2.5 flex items-center gap-2 rounded-full border border-hair bg-white py-1 pr-1 pl-3.5">
        <MessageCircle size={18} className="shrink-0 text-ink-3" aria-hidden="true" />
        <label className="sr-only" htmlFor="mini-ask">
          Preguntale a Mini
        </label>
        <input
          id="mini-ask"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Preguntale algo a Mini…"
          maxLength={300}
          className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
        />
        <button
          type="submit"
          disabled={!input.trim() || asking}
          aria-label="Enviar pregunta"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40"
        >
          {asking ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
        </button>
      </form>
    </section>
  )
}
