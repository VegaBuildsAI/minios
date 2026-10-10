import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BarChart3, Bell, Camera, CreditCard, NotebookPen, Sparkles, Truck, type LucideIcon } from 'lucide-react'
import { Chip, Eyebrow } from '../components'
import { SupplierToday } from '../widgets/SupplierToday'
import { BitacoraMonitor } from '../widgets/BitacoraMonitor'
import { Companion } from '../widgets/Companion'
import { useAuth } from '@/modules/auth/context'
import { useDashboardStats, useOpenShift } from '@/lib/data'
import { greetingFor, useGreetingSeed, useNow } from '@/lib/greeting'
import { useInsights } from '@/lib/insights'
import { formatCRC } from '@/lib/types'
import { fmtDate } from '@/lib/time'

const DAILY_GOAL = 120000
const INTRO_KEY = 'minios-intro-shown'

const QUICK: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/app/bitacora', label: 'Factura', icon: Camera },
  { to: '/app/bitacora', label: 'Bitácora', icon: NotebookPen },
  { to: '/app/proveedores', label: 'Pedidos', icon: Truck },
  { to: '/app/reports', label: 'Reportes', icon: BarChart3 },
]

function dateLabel(d: Date) {
  const s = fmtDate(d, { weekday: 'long', day: 'numeric', month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1).replace('.', '')
}

/** Introducción completa una vez por sesión (al abrir la app); después, una entrada breve. */
function useIntro() {
  const [intro] = useState(() => {
    try {
      return sessionStorage.getItem(INTRO_KEY) !== '1'
    } catch {
      return true
    }
  })
  useEffect(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      /* sin sessionStorage: siempre intro completa */
    }
  }, [])
  return intro
}

const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties

export function Home() {
  const { profile } = useAuth()
  const { data: stats } = useDashboardStats()
  const { data: shift } = useOpenShift()
  const { insights } = useInsights()
  const now = useNow()
  const intro = useIntro()
  const seed = useGreetingSeed()
  const firstName = (profile?.full_name || 'Michael').split(' ')[0]
  const initial = firstName.charAt(0).toUpperCase()
  const g = greetingFor(now, firstName, seed)
  const salesToday = stats?.salesTodayTotal ?? 0
  const pct = Math.min(100, Math.round((salesToday / DAILY_GOAL) * 100))
  const critical = stats?.criticalCount ?? 0
  const enter = intro ? 'intro-rise' : 'intro-soft'
  const alerts = insights.filter((i) => i.severity !== 'ok').length

  return (
    <div className="flex flex-col gap-4">
      <header className={`flex items-start justify-between gap-3 ${enter}`} style={delay(0)}>
        <div className="min-w-0">
          <Eyebrow>
            {dateLabel(now)} · {shift ? 'Turno abierto' : 'Sin turno'}
          </Eyebrow>
          <h1 className="font-display-m mt-1 text-[1.875rem] leading-[1.08] font-bold text-ink">
            {g.lead}
            <span className="text-brand">{g.highlight}</span>
            {g.tail}
          </h1>
          <p className={`mt-1.5 flex items-start gap-1.5 text-[1.0625rem] leading-snug text-ink-2 ${enter}`} style={delay(160)}>
            <Sparkles size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
            {g.subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/app/alerta"
            aria-label={alerts > 0 ? `Alertas, ${alerts} nuevas` : 'Alertas'}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-hair bg-white text-ink"
          >
            <Bell size={20} aria-hidden="true" />
            {alerts > 0 && <span className="absolute top-[9px] right-[10px] h-2 w-2 rounded-full border-2 border-white bg-[#c2410c]" />}
          </Link>
          <Link to="/app/mas" aria-label={`Perfil de ${firstName}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-base font-bold text-white">
            {initial}
          </Link>
        </div>
      </header>

      {/* Mini: lee el estado real del abastecedor y conversa */}
      <Companion goal={DAILY_GOAL} slot={g.slot} intro={intro} />

      <Link
        to="/app/caja"
        className={`flex h-12 items-center justify-center gap-2 rounded-[14px] bg-marigold text-base font-bold text-ink ${enter}`}
        style={delay(520)}
      >
        <Camera size={20} aria-hidden="true" /> Registrar tiquete
      </Link>

      {/* Pulso del día */}
      <div className={`grid grid-cols-3 gap-2 ${enter}`} style={delay(620)}>
        <Link to="/app/ventas" className="flex flex-col gap-1 rounded-[18px] border border-hair bg-white p-3">
          <span className="flex items-center gap-1 text-[0.75rem] font-semibold text-ink-2">
            <BarChart3 size={14} className="text-brand" aria-hidden="true" /> Ventas hoy
          </span>
          <span className="font-display-m tabular-nums text-[1.25rem] leading-tight font-bold text-ink">{formatCRC(salesToday)}</span>
          <span className="tabular-nums text-[0.75rem] text-ink-2">
            {stats?.salesTodayCount ?? 0} tiquetes · {pct} %
          </span>
        </Link>
        <Link to="/app/inventario" className="flex flex-col gap-1 rounded-[18px] border border-hair bg-white p-3">
          <span className="flex items-center gap-1 text-[0.75rem] font-semibold text-ink-2">
            <AlertTriangle size={14} className="text-warn" aria-hidden="true" /> Críticos
          </span>
          <span className="font-display-m tabular-nums text-[1.25rem] leading-tight font-bold text-ink">{critical}</span>
          <span className="self-start">
            <Chip tone={critical > 0 ? 'amber' : 'brand'}>{critical > 0 ? 'Revisar' : 'Al día'}</Chip>
          </span>
        </Link>
        <div className="flex flex-col gap-1 rounded-[18px] border border-hair bg-white p-3">
          <span className="flex items-center gap-1 text-[0.75rem] font-semibold text-ink-2">
            <CreditCard size={14} className="text-danger" aria-hidden="true" /> Fiado
          </span>
          <span className="font-display-m tabular-nums text-[1.25rem] leading-tight font-bold text-ink">{formatCRC(stats?.fiadoTotal ?? 0)}</span>
          <span className="text-[0.75rem] text-ink-2">por cobrar</span>
        </div>
      </div>

      {/* Accesos rápidos */}
      <nav aria-label="Accesos rápidos" className={`grid grid-cols-4 gap-2 ${enter}`} style={delay(720)}>
        {QUICK.map(({ to, label, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-hair bg-white px-1 py-3 text-[0.75rem] font-semibold text-ink"
          >
            <Icon size={20} className="text-brand" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Proveedor que visita hoy (o el próximo) — datos reales */}
      <div className={enter} style={delay(820)}>
        <SupplierToday />
      </div>

      {/* Monitor de Bitácora */}
      <div className={enter} style={delay(900)}>
        <BitacoraMonitor />
      </div>
    </div>
  )
}
