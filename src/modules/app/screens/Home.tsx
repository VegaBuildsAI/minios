import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Camera,
  ChevronRight,
  CreditCard,
  NotebookPen,
  Sparkles,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { Chip, Eyebrow, ProgressBar } from '../components'
import { SupplierToday } from '../widgets/SupplierToday'
import { BitacoraMonitor } from '../widgets/BitacoraMonitor'
import { useAuth } from '@/modules/auth/context'
import { useDashboardStats, useOpenShift } from '@/lib/data'
import { useInsights } from '@/lib/insights'
import { formatCRC } from '@/lib/types'

const DAILY_GOAL = 120000

const QUICK: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/app/bitacora', label: 'Factura', icon: Camera },
  { to: '/app/bitacora', label: 'Bitácora', icon: NotebookPen },
  { to: '/app/proveedores', label: 'Pedidos', icon: Truck },
  { to: '/app/reports', label: 'Reportes', icon: BarChart3 },
]

function todayLabel() {
  const s = new Date().toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1).replace('.', '')
}

export function Home() {
  const { profile } = useAuth()
  const { data: stats } = useDashboardStats()
  const { data: shift } = useOpenShift()
  const { insights } = useInsights()
  const tip = insights[0]
  const firstName = (profile?.full_name || 'Michael').split(' ')[0]
  const initial = firstName.charAt(0).toUpperCase()
  const salesToday = stats?.salesTodayTotal ?? 0
  const pct = Math.min(100, Math.round((salesToday / DAILY_GOAL) * 100))
  const critical = stats?.criticalCount ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Saludo */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>
            {todayLabel()} · {shift ? 'Turno abierto' : 'Sin turno'}
          </Eyebrow>
          <h1 className="font-display-m mt-0.5 text-[1.875rem] leading-[1.1] font-bold text-ink">Buenas, {firstName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/alerta"
            aria-label={insights.length > 0 ? `Alertas, ${insights.length} nuevas` : 'Alertas'}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-hair bg-white text-ink"
          >
            <Bell size={20} aria-hidden="true" />
            {insights.length > 0 && (
              <span className="absolute top-[9px] right-[10px] h-2 w-2 rounded-full border-2 border-white bg-[#c2410c]" />
            )}
          </Link>
          <Link
            to="/app/mas"
            aria-label={`Perfil de ${firstName}`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-base font-bold text-white"
          >
            {initial}
          </Link>
        </div>
      </header>

      {/* Ventas de hoy */}
      <section aria-label="Ventas de hoy" className="flex flex-col gap-3.5 rounded-[24px] bg-brand p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[0.875rem] font-medium text-brand-on">Ventas de hoy</div>
            <div className="font-display-m tabular-nums text-[2.5rem] leading-[1.05] font-bold">{formatCRC(salesToday)}</div>
          </div>
          <span className="tabular-nums rounded-full bg-brand-mid px-2.5 py-1.5 text-[0.8125rem] font-semibold">
            {stats?.salesTodayCount ?? 0} tickets
          </span>
        </div>
        <div>
          <ProgressBar pct={pct} tone="marigold" track="bg-brand-dark" height="h-2.5" />
          <div className="tabular-nums mt-2 flex justify-between text-[0.8125rem] text-brand-on">
            <span>{pct} % de la meta</span>
            <span>Meta {formatCRC(DAILY_GOAL)}</span>
          </div>
        </div>
        <Link
          to="/app/caja"
          className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-marigold text-base font-bold text-ink"
        >
          <Camera size={20} aria-hidden="true" /> Registrar tiquete
        </Link>
      </section>

      {/* Sugerencia (motor de insights) */}
      <Link to={tip ? '/app/alerta' : '/app/assistant'} className="flex items-start gap-3 rounded-[18px] border border-hair bg-white p-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-brand-tint text-brand">
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.75rem] font-bold tracking-[0.06em] text-brand uppercase">Sugerencia</span>
          <span className="mt-0.5 block text-[0.9375rem] leading-snug font-semibold text-ink">
            {tip ? tip.title : 'Todo en orden por ahora'}
          </span>
          <span className="mt-0.5 block text-[0.875rem] text-ink-2">{tip ? tip.detail : 'Preguntale al asistente lo que necesités.'}</span>
        </span>
        <ChevronRight size={20} className="mt-2 text-ink-3" aria-hidden="true" />
      </Link>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/app/inventario" className="flex flex-col gap-1.5 rounded-[18px] border border-hair bg-white p-3.5">
          <span className="flex items-center gap-1.5 text-[0.875rem] font-medium text-ink-2">
            <AlertTriangle size={18} className="text-warn" aria-hidden="true" /> Inventario crítico
          </span>
          <span className="font-display-m tabular-nums text-[1.75rem] leading-none font-bold text-ink">
            {critical} <span className="font-body-m text-[0.875rem] font-medium text-ink-2">productos</span>
          </span>
          <span className="self-start">
            <Chip tone={critical > 0 ? 'amber' : 'brand'}>{critical > 0 ? 'Revisar' : 'Al día'}</Chip>
          </span>
        </Link>
        <div className="flex flex-col gap-1.5 rounded-[18px] border border-hair bg-white p-3.5">
          <span className="flex items-center gap-1.5 text-[0.875rem] font-medium text-ink-2">
            <CreditCard size={18} className="text-danger" aria-hidden="true" /> Fiado por cobrar
          </span>
          <span className="font-display-m tabular-nums text-[1.75rem] leading-none font-bold text-ink">
            {formatCRC(stats?.fiadoTotal ?? 0)}
          </span>
          <span className="self-start">
            <Chip tone="rose">Por cobrar</Chip>
          </span>
        </div>
      </div>

      {/* Accesos rápidos */}
      <nav aria-label="Accesos rápidos" className="grid grid-cols-4 gap-2">
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
      <div>
        <SupplierToday />
      </div>

      {/* Monitor de Bitácora */}
      <div>
        <BitacoraMonitor />
      </div>
    </div>
  )
}
