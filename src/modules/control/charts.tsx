import { useId, useState } from 'react'
import type { TrendPoint } from '@/lib/data'
import { formatCRC } from '@/lib/types'
import { crNoonOf, fmtDate } from '@/lib/time'

export const C_VENTAS = '#12845F'
export const C_GANANCIA = '#C98314'
const GLOW_V = 'rgba(18,132,95,.45)'
const GLOW_G = 'rgba(201,131,20,.45)'

/** Puntos [x,y] normalizados al ancho/alto dados. */
function pts(vals: number[], w: number, h: number, pad: number, lo?: number, hi?: number): [number, number][] {
  const mn = lo ?? Math.min(...vals)
  const mx = hi ?? Math.max(...vals)
  const rng = mx - mn || 1
  const n = vals.length
  return vals.map((v, i) => [n <= 1 ? w / 2 : (i / (n - 1)) * w, h - pad - ((v - mn) / rng) * (h - pad * 2)])
}
const line = (p: [number, number][]) => p.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ')
const area = (p: [number, number][], h: number) => (p.length ? `${line(p)} L${p[p.length - 1][0].toFixed(1)} ${h} L${p[0][0].toFixed(1)} ${h} Z` : '')

/** Mini tendencia lineal con área degradada y brillo (KPIs y tabla). */
export function Sparkline({ values, color = C_VENTAS, glow, height = 34, fill = true }: { values: number[]; color?: string; glow?: string; height?: number; fill?: boolean }) {
  const gid = useId().replace(/:/g, '')
  if (values.length < 2) return <div style={{ height }} aria-hidden="true" />
  const flat = values.every((v) => v === values[0])
  const p = pts(values, 100, 32, 3, flat ? values[0] - 1 : undefined, flat ? values[0] + 1 : undefined)
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" className="w-full overflow-visible" style={{ height }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.32" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area(p, 32)} fill={`url(#${gid})`} />
        </>
      )}
      <path
        d={line(p)}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={glow ? { filter: `drop-shadow(0 0 4px ${glow})` } : undefined}
      />
    </svg>
  )
}

function compact(n: number): string {
  if (n >= 1_000_000) return `₡${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₡${Math.round(n / 1_000)}k`
  return `₡${Math.round(n)}`
}

const W = 1000
const H = 220

/**
 * Ventas y ganancia por día, sobre vidrio: dos líneas con área y brillo, cuadrícula fina,
 * crosshair + tooltip al pasar el mouse o tocar. Por defecto se lee el último punto (HOY).
 */
export function TrendGlass({ points }: { points: TrendPoint[] }) {
  const n = points.length
  const [sel, setSel] = useState<number | null>(null)
  if (n === 0) return null
  const idx = sel ?? n - 1
  const max = Math.max(1, ...points.map((p) => Math.max(p.ventas, p.ganancia)))
  const top = Math.ceil(max / 4 / 1000) * 1000 * 4 || 4
  const pV = pts(points.map((p) => p.ventas), W, H, 0, 0, top)
  const pG = pts(points.map((p) => p.ganancia), W, H, 0, 0, top)
  const cur = points[idx]
  const xPct = n <= 1 ? 50 : (idx / (n - 1)) * 100
  const isToday = idx === n - 1
  const d = crNoonOf(cur.key)
  const head = `${isToday ? 'HOY · ' : ''}${fmtDate(d, { weekday: 'short', day: 'numeric' }).toUpperCase()}`
  const total = points.reduce((a, p) => a + p.ventas, 0)
  const lo = Math.min(...points.map((p) => p.ventas))
  const hi = Math.max(...points.map((p) => p.ventas))

  const onMove = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    setSel(Math.round(f * (n - 1)))
  }

  return (
    <div>
      <div className="flex gap-2.5">
        <div className="font-mono-m tabular-nums flex h-[220px] w-11 flex-col justify-between text-right text-[0.6875rem] text-ink-3" aria-hidden="true">
          {[4, 3, 2, 1, 0].map((k) => (
            <span key={k}>{compact((top * k) / 4)}</span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`Ventas diarias de ${n} días: total ${formatCRC(total)}, entre ${formatCRC(lo)} y ${formatCRC(hi)}. ${isToday ? 'Hoy' : head}: ${formatCRC(cur.ventas)} en ventas y ${formatCRC(cur.ganancia)} de ganancia.`}
          className="relative h-[220px] min-w-0 flex-1 touch-none rounded-[10px] border-b border-[rgba(27,31,28,0.18)]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.35)',
            backgroundImage: 'linear-gradient(var(--m-chart-grid) 1px, transparent 1px), linear-gradient(90deg, rgba(27,31,28,0.05) 1px, transparent 1px)',
            backgroundSize: `100% 25%, calc(100% / ${Math.max(1, n - 1)}) 100%`,
          }}
          onPointerMove={(e) => onMove(e.clientX, e.currentTarget)}
          onPointerDown={(e) => onMove(e.clientX, e.currentTarget)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setSel(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id="tgV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={C_VENTAS} stopOpacity="0.22" />
                <stop offset="1" stopColor={C_VENTAS} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="tgG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={C_GANANCIA} stopOpacity="0.22" />
                <stop offset="1" stopColor={C_GANANCIA} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area(pV, H)} fill="url(#tgV)" />
            <path d={area(pG, H)} fill="url(#tgG)" />
            <path d={line(pV)} fill="none" stroke={C_VENTAS} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 6px ${GLOW_V})` }} />
            <path d={line(pG)} fill="none" stroke={C_GANANCIA} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 6px ${GLOW_G})` }} />
            <line x1={pV[idx][0]} x2={pV[idx][0]} y1="0" y2={H} stroke="#636A65" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          </svg>
          <Dot left={xPct} top={(pV[idx][1] / H) * 100} color={C_VENTAS} glow={GLOW_V} />
          <Dot left={xPct} top={(pG[idx][1] / H) * 100} color={C_GANANCIA} glow={GLOW_G} />
          <div
            className="font-mono-m tabular-nums pointer-events-none absolute top-2 rounded-[10px] border border-[rgba(14,90,71,0.18)] px-2.5 py-2 text-[0.75rem] leading-relaxed text-ink"
            style={{
              background: 'rgba(255,255,255,0.72)',
              WebkitBackdropFilter: 'blur(10px)',
              backdropFilter: 'blur(10px)',
              ...(xPct > 55 ? { right: `calc(${100 - xPct}% + 14px)` } : { left: `calc(${xPct}% + 14px)` }),
            }}
          >
            <div className="tracking-[0.08em] text-ink-2">{head}</div>
            <div>
              <span style={{ color: C_VENTAS }}>●</span> Ventas <b>{formatCRC(cur.ventas)}</b>
            </div>
            <div>
              <span style={{ color: C_GANANCIA }}>●</span> Ganancia <b>{formatCRC(cur.ganancia)}</b>
            </div>
          </div>
        </div>
      </div>
      <div className="font-mono-m tabular-nums mt-1.5 ml-[54px] flex justify-between text-[0.6875rem] text-ink-3" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.key} className={i === n - 1 ? 'font-bold text-ink' : ''}>
            {i === n - 1 ? 'Hoy' : n > 16 && i % 3 !== 0 ? '' : p.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Dot({ left, top, color, glow }: { left: number; top: number; color: string; glow: string }) {
  return (
    <span
      className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
      style={{ left: `${left}%`, top: `${top}%`, background: color, boxShadow: `0 0 10px ${glow}` }}
    />
  )
}
