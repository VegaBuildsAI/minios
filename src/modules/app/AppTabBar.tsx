import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Home, Mic, MoreHorizontal, Package, type LucideIcon } from 'lucide-react'

interface TabItem {
  to: string
  label: string
  icon: LucideIcon
  /** Rutas hijas que también marcan esta pestaña como activa. */
  also?: string[]
}

const LEFT: TabItem[] = [
  { to: '/app', label: 'Inicio', icon: Home },
  { to: '/app/inventario', label: 'Inventario', icon: Package },
]
const RIGHT: TabItem[] = [
  { to: '/app/ventas', label: 'Ventas', icon: BarChart3 },
  {
    to: '/app/mas',
    label: 'Más',
    icon: MoreHorizontal,
    also: ['/app/bitacora', '/app/proveedores', '/app/config', '/app/reports', '/app/alerta'],
  },
]

function Tab({ to, label, icon: Icon, also }: TabItem) {
  const { pathname } = useLocation()
  const extra = also?.some((p) => pathname.startsWith(p)) ?? false
  return (
    <NavLink
      to={to}
      end={to === '/app'}
      className={({ isActive }) =>
        `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] text-[0.75rem] transition-colors ${
          isActive || extra ? 'font-bold text-brand' : 'font-semibold text-ink-2'
        }`
      }
    >
      <Icon size={24} strokeWidth={2} aria-hidden="true" />
      {label}
    </NavLink>
  )
}

export function AppTabBar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="relative z-40 shrink-0 border-t border-hair bg-white px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <div className="flex items-end">
        {LEFT.map((t) => (
          <Tab key={t.to} {...t} />
        ))}

        {/* Botón central: asistente de IA por voz */}
        <div className="flex flex-1 justify-center">
          <NavLink to="/app/assistant" className="flex flex-col items-center gap-[3px] text-[0.75rem] font-bold text-ink">
            <span className="-mt-[26px] flex h-14 w-14 items-center justify-center rounded-full border-4 border-paper bg-ink text-marigold shadow-[0_6px_16px_-6px_rgba(27,31,28,0.5)]">
              <Mic size={24} strokeWidth={2.2} aria-hidden="true" />
            </span>
            Asistente
          </NavLink>
        </div>

        {RIGHT.map((t) => (
          <Tab key={t.to} {...t} />
        ))}
      </div>
    </nav>
  )
}
