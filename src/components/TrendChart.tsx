import { useId, useState } from 'react'
import type { TrendPoint } from '@/lib/data'
import { formatCRC } from '@/lib/types'

const W = 320
const H = 150
const PAD = { l: 38, r: 8, t: 8, b: 22 }
const INNER_W = W - PAD.l - PAD.r
const INNER_H = H - PAD.t - PAD.b

const VENTAS = '#0e5a47' // Mostrador brand
const GANANCIA = '#b7791f' // caléndula oscura (≥3:1 sobre blanco)

function compact(n: number): string {
  if (n >= 1_000_000) return `₡${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₡${Math.round(n / 1_000)}k`
  return `₡${Math.round(n)}`
}

/**
 * Tendencia general de ventas y ganancia. SVG propio (sin librería de gráficos):
 * área = Ventas, línea = Ganancia. Tocá un punto para ver el detalle de ese bucket.
 */
export function TrendChart({ points, caption }: { points: TrendPoint[]; caption?: string }) {
  const gid = useId().replace(/:/g, '')
  const [sel, setSel] = useState<number | null>(null)

  const n = points.length
  const max = Math.max(1, ...points.map((p) => Math.max(p.ventas, p.ganancia)))
  const hasData = points.some((p) => p.ventas > 0)

  const x = (i: number) => PAD.l + (n <= 1 ? INNER_W / 2 : (i * INNER_W) / (n - 1))
  const y = (v: number) => PAD.t + INNER_H - (v / max) * INNER_H

  const line = (key: 'ventas' | 'ganancia') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ')
  const area = `${line('ventas')} L${x(n - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`

  const step = Math.max(1, Math.ceil(n / 6))
  const grid = [0, 0.5, 1]
  const slot = n <= 1 ? INNER_W : INNER_W / (n - 1)
  const active = sel !== null ? points[sel] : null

  return (
    <div>
      {/* Leyenda / detalle del punto tocado */}
      <div className="mb-2 flex min-h-[2.4rem] flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[0.8125rem]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="h-2 w-2 rounded-full" style={{ background: VENTAS }} /> Ventas
          </span>
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="h-2 w-2 rounded-full" style={{ background: GANANCIA }} /> Ganancia
          </span>
        </div>
        {active ? (
          <div className="tabular-nums text-ink">
            <b>{active.label}</b> · {formatCRC(active.ventas)} · <span className="text-warn">{formatCRC(active.ganancia)}</span>
          </div>
        ) : caption ? (
          <div className="text-ink-3">{caption}</div>
        ) : null}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label="Tendencia de ventas y ganancia">
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={VENTAS} stopOpacity="0.35" />
            <stop offset="1" stopColor={VENTAS} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Cuadrícula + eje Y */}
        {grid.map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(max * g)} y2={y(max * g)} stroke="#e6e1d6" strokeWidth="1" strokeDasharray={g === 0 ? '0' : '3 3'} />
            <text x={PAD.l - 5} y={y(max * g) + 3} textAnchor="end" fontSize="9.5" fill="#636a65">
              {g === 0 ? '0' : compact(max * g)}
            </text>
          </g>
        ))}

        {/* Series */}
        {hasData && n > 1 && <path d={area} fill={`url(#g${gid})`} />}
        {hasData && n > 1 && <path d={line('ventas')} fill="none" stroke={VENTAS} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {hasData && n > 1 && <path d={line('ganancia')} fill="none" stroke={GANANCIA} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

        {/* Puntos (cuando hay pocos o se selecciona) */}
        {hasData &&
          points.map((p, i) =>
            n <= 12 || i === sel ? (
              <g key={p.key}>
                <circle cx={x(i)} cy={y(p.ventas)} r={i === sel ? 3.5 : 2.5} fill={VENTAS} />
                <circle cx={x(i)} cy={y(p.ganancia)} r={i === sel ? 3.5 : 2.5} fill={GANANCIA} />
              </g>
            ) : null,
          )}

        {/* Línea guía del punto seleccionado */}
        {sel !== null && <line x1={x(sel)} x2={x(sel)} y1={PAD.t} y2={y(0)} stroke="#d8d2c4" strokeWidth="1" strokeDasharray="3 3" />}

        {/* Etiquetas del eje X */}
        {points.map((p, i) =>
          i % step === 0 ? (
            <text key={p.key} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#636a65">
              {p.label}
            </text>
          ) : null,
        )}

        {/* Zonas táctiles: una por bucket */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.key}`}
            x={x(i) - slot / 2}
            y={PAD.t}
            width={slot}
            height={INNER_H}
            fill="transparent"
            // Pointer events: el mouse selecciona al pasar y suelta al salir; el toque
            // selecciona y se queda hasta tocar otro punto (sin alternar → no se auto-borra).
            onPointerEnter={() => setSel(i)}
            onPointerDown={() => setSel(i)}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') setSel(null)
            }}
          />
        ))}

        {!hasData && (
          <text x={W / 2} y={PAD.t + INNER_H / 2} textAnchor="middle" fontSize="10" fill="#636a65">
            Sin ventas en el período
          </text>
        )}
      </svg>
    </div>
  )
}
