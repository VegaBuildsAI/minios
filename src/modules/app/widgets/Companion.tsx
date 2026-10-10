import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useCompanion, type Mood } from '@/lib/companion'
import type { DaySlot } from '@/lib/greeting'
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
 * Compañero del Inicio: el robot (área de grilla «bot») y su globo (área «bubble»).
 * Tocar al robot lo hace reaccionar y pasa al siguiente aviso; si nadie interactúa
 * un rato se duerme y se alegra al volver.
 */
export function Companion({ goal, slot, intro }: { goal: number; slot: DaySlot; intro: boolean }) {
  const { messages, loading } = useCompanion(goal, slot)
  const [idx, setIdx] = useState(0)
  const [react, setReact] = useState<Mood | null>(null)
  const [asleep, setAsleep] = useState(false)
  const [seen, setSeen] = useState(0)
  const reactTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const msg = messages[Math.min(idx, messages.length - 1)]
  const full = `${msg.title} ${msg.text}`
  const typed = useTyped(full, `${msg.id}:${seen}`, intro && seen === 0 ? 1100 : 120, intro && seen === 0 ? 28 : 14)

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

  const mood: Mood = loading ? 'thinking' : (react ?? (asleep ? 'sleepy' : msg.mood))

  const next = () => {
    flash(messages.length > 1 ? 'wink' : 'excited')
    setIdx((i) => (i + 1) % messages.length)
    setSeen((s) => s + 1)
  }

  const titleShown = typed.shown.slice(0, msg.title.length)
  const textShown = typed.shown.slice(msg.title.length + 1)

  return (
    <>
      <div className="-mt-3 -mb-7 justify-self-end [grid-area:bot]">
        <MiniBot
          mood={mood}
          intro={intro}
          reacting={react === 'wink' || react === 'excited'}
          onClick={next}
          label={messages.length > 1 ? `Mini, tu asistente. Tocá para el siguiente aviso (${idx + 1} de ${messages.length})` : 'Mini, tu asistente'}
        />
      </div>

      <Link
        to={msg.to}
        onClick={() => flash('excited')}
        className={`relative flex min-h-[132px] flex-col justify-between rounded-[22px] border border-[#cfe3da] bg-[#e8f3ed] p-3.5 text-ink shadow-[0_10px_30px_-18px_rgba(14,90,71,0.45)] [grid-area:bubble] ${intro ? 'bubble-pop' : 'intro-soft'}`}
        style={{ ['--d' as string]: intro ? '900ms' : '0ms' }}
      >
        {/* Cola del globo, apuntando al robot */}
        <span aria-hidden="true" className="absolute -top-[9px] left-[58%] h-4 w-4 rotate-45 rounded-[3px] border-t border-l border-[#cfe3da] bg-[#e8f3ed]" />
        <span className="sr-only" aria-live="polite">
          {/[.!?]$/.test(msg.title) ? msg.title : `${msg.title}.`} {msg.text}
        </span>
        <span aria-hidden="true" className="block">
          <span className="block text-[0.9375rem] leading-snug font-bold">
            {titleShown}
            {!typed.done && typed.shown.length <= msg.title.length && <span className="type-caret" />}
          </span>
          <span className="mt-1 block text-[0.8125rem] leading-snug text-ink-2">
            {textShown}
            {!typed.done && typed.shown.length > msg.title.length && <span className="type-caret" />}
          </span>
        </span>
        <span className="mt-2 flex items-center justify-between" aria-hidden="true">
          {messages.length > 1 ? (
            <span className="flex gap-1">
              {messages.map((m, i) => (
                <span key={m.id} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-brand' : 'w-1.5 bg-[#b9d6c8]'}`} />
              ))}
            </span>
          ) : (
            <span />
          )}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-brand">
            <ChevronRight size={18} />
          </span>
        </span>
      </Link>
    </>
  )
}
