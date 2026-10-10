import type { Mood } from '@/lib/companion'

const EYE = '#4EE6A8'

/** Ojos (y boca/cejas) según el ánimo. Coordenadas del visor: x 34–106, y 36–82. */
function Face({ mood }: { mood: Mood }) {
  const stroke = { stroke: EYE, strokeWidth: 5, strokeLinecap: 'round' as const, fill: 'none' }
  switch (mood) {
    case 'excited':
      return (
        <g className="minibot-glow">
          <path d="M45 63 q10 -16 20 0" {...stroke} />
          <path d="M75 63 q10 -16 20 0" {...stroke} />
          <path d="M61 72 q9 7 18 0" {...stroke} strokeWidth={4} />
        </g>
      )
    case 'wink':
      return (
        <g className="minibot-glow">
          <path d="M47 62 q8 -11 16 0" {...stroke} />
          <path d="M77 59 h16" {...stroke} />
          <path d="M62 71 q8 5 16 0" {...stroke} strokeWidth={4} />
        </g>
      )
    case 'worried':
      return (
        <g className="minibot-glow">
          <path d="M46 49 l14 4" {...stroke} strokeWidth={4} />
          <path d="M94 49 l-14 4" {...stroke} strokeWidth={4} />
          <g className="minibot-blink">
            <circle cx="55" cy="62" r="5.5" fill={EYE} />
            <circle cx="85" cy="62" r="5.5" fill={EYE} />
          </g>
          <path d="M62 75 q8 -5 16 0" {...stroke} strokeWidth={3.5} />
        </g>
      )
    case 'sleepy':
      return (
        <g className="minibot-glow">
          <path d="M47 60 q8 5 16 0" {...stroke} />
          <path d="M77 60 q8 5 16 0" {...stroke} />
        </g>
      )
    case 'thinking':
      return (
        <g className="minibot-glow">
          <g className="minibot-blink minibot-look">
            <circle cx="58" cy="56" r="5" fill={EYE} />
            <circle cx="88" cy="56" r="5" fill={EYE} />
          </g>
          <path d="M64 73 h12" {...stroke} strokeWidth={3.5} />
        </g>
      )
    default:
      return (
        <g className="minibot-glow">
          <path d="M47 62 q8 -11 16 0" {...stroke} />
          <path d="M77 62 q8 -11 16 0" {...stroke} />
        </g>
      )
  }
}

/**
 * «Mini», el compañero del Inicio. Flota, parpadea, saluda al entrar y reacciona
 * cuando lo tocan. El ánimo cambia ojos, cejas, antena y gestos.
 */
export function MiniBot({
  mood,
  intro,
  reacting,
  onClick,
  label,
  size = 128,
}: {
  mood: Mood
  intro: boolean
  reacting: boolean
  onClick: () => void
  label: string
  size?: number
}) {
  const led = mood === 'worried' ? '#E8A33D' : mood === 'sleepy' ? '#7C8A83' : EYE
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-mood={mood}
      className={`minibot relative block touch-manipulation rounded-full ${intro ? 'minibot-enter' : 'minibot-fade'}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 140 140" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="minibot-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#E6EAE7" />
          </linearGradient>
          <radialGradient id="minibot-visor" cx="0.4" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#26302B" />
            <stop offset="1" stopColor="#111613" />
          </radialGradient>
        </defs>
        <ellipse cx="70" cy="134" rx="30" ry="4.5" fill="rgba(27,31,28,0.10)" className="minibot-shadow" />
        <g className={`minibot-float ${reacting ? 'minibot-hop' : ''} ${mood === 'worried' ? 'minibot-shake' : ''}`}>
          {/* Antena */}
          <line x1="70" y1="14" x2="70" y2="26" stroke="#CDD4D0" strokeWidth="3" strokeLinecap="round" />
          <circle cx="70" cy="11" r="5" fill={led} className="minibot-led" />
          {/* Orejas */}
          <rect x="12" y="46" width="14" height="32" rx="7" fill="#0E5A47" />
          <rect x="114" y="46" width="14" height="32" rx="7" fill="#0E5A47" />
          {/* Cabeza y visor */}
          <rect x="22" y="22" width="96" height="72" rx="34" fill="url(#minibot-shell)" stroke="#DCE1DD" />
          <rect x="33" y="34" width="74" height="48" rx="23" fill="url(#minibot-visor)" />
          <path d="M42 41 q10 -4 22 -3" stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <g key={mood} className="minibot-face">
            <Face mood={mood} />
          </g>
          {/* Cuerpo */}
          <rect x="34" y="96" width="12" height="24" rx="6" fill="url(#minibot-shell)" stroke="#DCE1DD" transform="rotate(12 40 98)" />
          <g className={intro ? 'minibot-wave' : ''}>
            <rect x="94" y="96" width="12" height="24" rx="6" fill="url(#minibot-shell)" stroke="#DCE1DD" transform="rotate(-12 100 98)" />
          </g>
          <rect x="46" y="92" width="48" height="36" rx="17" fill="url(#minibot-shell)" stroke="#DCE1DD" />
          <circle cx="70" cy="110" r="7" fill="#0E5A47" />
          <circle cx="70" cy="110" r="3.2" fill={led} className="minibot-led" />
        </g>
        {mood === 'sleepy' && (
          <g className="minibot-z" fill="#4A524D" fontWeight="700" fontFamily="var(--m-font-display)">
            <text x="112" y="24" fontSize="14">z</text>
            <text x="122" y="12" fontSize="10">z</text>
          </g>
        )}
        {mood === 'thinking' && (
          <g className="minibot-dots" fill="#0E5A47">
            <circle cx="114" cy="20" r="3" />
            <circle cx="123" cy="14" r="3" />
            <circle cx="132" cy="8" r="3" />
          </g>
        )}
      </svg>
    </button>
  )
}
