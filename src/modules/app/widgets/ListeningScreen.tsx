import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Camera, Keyboard, Square, X } from 'lucide-react'

/** Segundos que la pregunta queda a la vista para corregirla antes de enviarse sola. */
const REVIEW_SECONDS = 3

const BARS = [14, 22, 30, 40, 52, 64, 76, 58, 84, 70, 92, 66, 80, 54, 42, 34, 26, 20, 14]
const RING_R = 50
const RING_LEN = 2 * Math.PI * RING_R

interface Props {
  phase: 'listening' | 'review'
  finalText: string
  interimText: string
  onStop: () => void
  onClose: () => void
  onKeyboard: (text: string) => void
  onCamera: () => void
  onSend: (text: string) => void
}

function SideButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-14 w-14 items-center justify-center rounded-full border text-paper hover:bg-white/5"
      style={{ borderColor: 'rgba(255,255,255,0.22)' }}
    >
      {children}
    </button>
  )
}

/** Pantalla de escucha del Asistente (diseño Cowork): dictado en vivo, revisión breve y envío. */
export function ListeningScreen({ phase, finalText, interimText, onStop, onClose, onKeyboard, onCamera, onSend }: Props) {
  const [draft, setDraft] = useState(`${finalText}${interimText}`.trim())
  const [counting, setCounting] = useState(true)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const review = phase === 'review'

  // En revisión, la pregunta se envía sola salvo que la toquen para corregirla.
  useEffect(() => {
    if (!review || !counting) return
    const t = setTimeout(() => onSend(draft), REVIEW_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [review, counting, draft, onSend])

  // El textarea crece con el texto, sin barra de desplazamiento.
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft, review])

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-ink text-paper" role="dialog" aria-label={review ? 'Revisá tu pregunta' : 'Escuchando'}>
      <div className="flex items-center px-4 py-3.5">
        <button onClick={onClose} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full text-paper hover:bg-white/5">
          <X size={22} aria-hidden="true" />
        </button>
        <div className="flex-1 text-center text-[0.875rem] font-semibold text-[#b9bfb9]">Español (Costa Rica)</div>
        <div className="w-11" />
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-7 pt-10">
        <div className="flex items-center gap-2 text-[0.8125rem] font-bold tracking-[0.08em] text-marigold uppercase">
          <span className={`h-2 w-2 rounded-full bg-marigold ${review ? '' : 'animate-pulse'}`} /> {review ? 'Revisá tu pregunta' : 'Escuchando'}
        </div>
        {review ? (
          // El tamaño va en el contenedor: la regla global de inputs (anti-zoom iOS) usa 1em.
          <div className="text-[2rem]">
            <textarea
              ref={areaRef}
              value={draft}
              onFocus={() => setCounting(false)}
              onChange={(e) => {
                setCounting(false)
                setDraft(e.target.value)
              }}
              rows={1}
              aria-label="Tu pregunta"
              className="font-display-m w-full resize-none overflow-hidden bg-transparent leading-[1.2] font-bold text-white outline-none"
            />
          </div>
        ) : (
          <p aria-live="polite" className="font-display-m text-[2rem] leading-[1.2] font-bold text-white">
            {finalText || interimText ? (
              <>
                {finalText}
                {interimText && <span className="text-[#7d847e]">{interimText}…</span>}
              </>
            ) : (
              <span className="text-[#7d847e]">Decí tu pregunta…</span>
            )}
          </p>
        )}
        <p className="text-[0.9375rem] leading-relaxed text-[#b9bfb9]">
          {review
            ? counting
              ? 'La envío en un momento. Tocá el texto si querés corregirlo.'
              : 'Corregí lo que necesités y tocá enviar.'
            : 'Cuando dejés de hablar envío la pregunta. Podés corregir el texto antes.'}
        </p>
      </div>

      <div className="flex h-[110px] items-center justify-center gap-[7px]" aria-hidden="true">
        {BARS.map((h, i) => (
          <span
            key={i}
            className={`w-[5px] origin-center rounded-full ${review ? 'opacity-40' : 'animate-pulse'}`}
            style={{
              height: review ? Math.max(10, h * 0.25) : h * 0.75,
              background: i > 4 && i < 14 ? 'var(--m-marigold)' : '#5e665f',
              animationDelay: `${i * 0.07}s`,
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between px-6 pt-4 pb-[max(env(safe-area-inset-bottom),2rem)]">
        <SideButton label="Escribir en lugar de hablar" onClick={() => onKeyboard(review ? draft : `${finalText}${interimText}`.trim())}>
          <Keyboard size={22} aria-hidden="true" />
        </SideButton>

        <div className="relative flex h-[128px] w-[128px] items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-marigold/10" aria-hidden="true" />
          <span className="absolute inset-[12px] rounded-full bg-marigold/20" aria-hidden="true" />
          {review && counting && (
            <svg className="absolute inset-[12px] -rotate-90" viewBox="0 0 104 104" aria-hidden="true">
              <circle
                cx="52"
                cy="52"
                r={RING_R}
                fill="none"
                stroke="var(--m-marigold)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={RING_LEN}
                className="listen-countdown"
                style={{ ['--ring-len' as string]: `${RING_LEN}`, animationDuration: `${REVIEW_SECONDS}s` }}
              />
            </svg>
          )}
          {review ? (
            <button
              onClick={() => onSend(draft)}
              disabled={!draft.trim()}
              aria-label="Enviar pregunta"
              className="relative flex h-[84px] w-[84px] items-center justify-center rounded-full bg-marigold text-ink disabled:opacity-50"
            >
              <ArrowUp size={30} strokeWidth={2.5} aria-hidden="true" />
            </button>
          ) : (
            <button onClick={onStop} aria-label="Terminar y enviar" className="relative flex h-[84px] w-[84px] items-center justify-center rounded-full bg-marigold text-ink">
              <Square size={24} fill="currentColor" aria-hidden="true" />
            </button>
          )}
        </div>

        <SideButton label="Tomar foto de un documento" onClick={onCamera}>
          <Camera size={22} aria-hidden="true" />
        </SideButton>
      </div>
    </div>
  )
}
