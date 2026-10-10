import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useCompanion, usePlaybookMessage, type BotMessage, type Mood } from '@/lib/companion'
import type { DaySlot } from '@/lib/greeting'
import { fmtTime } from '@/lib/time'
import { MiniBot } from './MiniBot'

const IDLE_MS = 25_000

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

/**
 * «Mini» en el Inicio: un globo blanco con el mensaje y Mini afuera, en la esquina
 * derecha. Sin chat ni sugerencias y sin llamar a la IA: cuenta el plan del día (lo
 * redacta mini-daily una vez, 9:00 CR, con cifras en vivo) y los avisos locales.
 * Tocar a Mini pasa al siguiente aviso; «Ver» lleva a la pantalla donde se resuelve.
 * Su ánimo cambia con el aviso y con lo que hace el usuario (se duerme si nadie toca).
 */
export function Companion({ goal, slot, intro }: { goal: number; slot: DaySlot; intro: boolean }) {
  const { messages: local, loading: localLoading } = useCompanion(goal, slot)
  const { plan, message: planMsg, loading: planLoading } = usePlaybookMessage(goal, slot)
  // El índice se reinicia solo cuando cambia el plan del día (se muestra primero).
  const [cursor, setCursor] = useState({ k: '', i: 0 })
  const [react, setReact] = useState<Mood | null>(null)
  const [asleep, setAsleep] = useState(false)
  const [seen, setSeen] = useState(0)
  const reactTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Avisos: primero el plan del día; después los avisos locales (cada uno con su ánimo).
  const ai: BotMessage | null = planMsg
  const notices: BotMessage[] = ai ? [ai, ...local.filter((m) => m.id !== 'ok' && m.id !== 'ask' && m.id !== 'summary')] : local
  const planKey = ai?.id ?? 'local'
  const idx = cursor.k === planKey ? Math.min(cursor.i, notices.length - 1) : 0
  const notice = notices[idx]

  const first = intro && seen === 0
  const full = `${notice.title} ${notice.text}`
  const typed = useTyped(full, `${notice.id}:${seen}`, first ? 1100 : 100, first ? 26 : 14)
  const titleShown = typed.shown.slice(0, notice.title.length)
  const textShown = typed.shown.slice(notice.title.length + 1)

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

  const baseMood: Mood = localLoading || planLoading ? 'thinking' : notice.mood
  const mood: Mood = react ?? (asleep ? 'sleepy' : baseMood)

  const tapBot = () => {
    flash(notices.length > 1 ? 'wink' : 'excited')
    setCursor({ k: planKey, i: (idx + 1) % notices.length })
    setSeen((s) => s + 1)
  }

  const status = plan ? `plan de hoy · ${fmtTime(plan.generated_at)}` : planLoading ? 'leyendo tu tienda…' : 'avisos de hoy'
  const enter = intro ? 'bubble-pop' : 'intro-soft'

  return (
    <section aria-label="Mini, tu asistente" className={intro ? 'intro-rise' : 'intro-soft'} style={{ ['--d' as string]: '300ms' }}>
      <div className="flex items-end gap-1">
        {/* Globo blanco: lo único que se ve del mensaje */}
        <div
          className={`relative min-w-0 flex-1 rounded-[20px] border border-hair bg-white p-3.5 shadow-[0_14px_32px_-20px_rgba(27,31,28,0.4)] ${enter}`}
          style={{ ['--d' as string]: intro ? '900ms' : '0ms' }}
        >
          {/* Cola del globo hacia Mini (abajo a la derecha) */}
          <span aria-hidden="true" className="absolute -right-[7px] bottom-9 h-3.5 w-3.5 rotate-45 rounded-[3px] border-t border-r border-hair bg-white" />
          <div className="mb-1 flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.06em] text-brand uppercase">
            {planLoading && <Loader2 size={11} className="animate-spin" aria-hidden="true" />}
            Mini · {status}
          </div>

          <span className="sr-only" aria-live="polite">
            {notice.title}
            {/[.!?…]$/.test(notice.title) ? ' ' : '. '}
            {notice.text}
          </span>
          <div aria-hidden="true">
            <p className="text-[1rem] leading-snug font-bold text-ink">
              {titleShown}
              {!typed.done && typed.shown.length <= notice.title.length && <span className="type-caret" />}
            </p>
            <p className="mt-0.5 text-[0.875rem] leading-snug whitespace-pre-line text-ink-2">
              {textShown}
              {!typed.done && typed.shown.length > notice.title.length && <span className="type-caret" />}
            </p>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            {notices.length > 1 ? (
              <span className="flex gap-1" aria-hidden="true">
                {notices.map((m, i) => (
                  <span key={m.id} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-brand' : 'w-1.5 bg-[#b9d6c8]'}`} />
                ))}
              </span>
            ) : (
              <span />
            )}
            <Link
              to={notice.to}
              onClick={() => flash('excited')}
              className="flex h-9 items-center gap-0.5 rounded-full bg-brand-tint pr-2 pl-3 text-[0.8125rem] font-bold text-brand"
            >
              Ver <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Mini, afuera del globo, en la esquina derecha */}
        <div className="-mr-2 -mb-1 shrink-0 self-end">
          <MiniBot
            mood={mood}
            intro={intro}
            size={96}
            reacting={react === 'wink' || react === 'excited'}
            onClick={tapBot}
            label={notices.length > 1 ? `Mini. Tocá para el siguiente aviso (${idx + 1} de ${notices.length})` : 'Mini, tu asistente'}
          />
        </div>
      </div>
    </section>
  )
}
