import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Info,
  LayoutDashboard,
  Menu,
  NotebookPen,
  Package,
  Receipt,
  Settings,
  Smartphone,
  Store,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/context'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: '/control', label: 'Panel de Control', icon: LayoutDashboard },
  { to: '/pos', label: 'Caja', icon: Receipt },
  { to: '/inventory', label: 'Inventario', icon: Package },
  { to: '/suppliers', label: 'Proveedores', icon: Truck },
  { to: '/bitacora', label: 'Bitácora', icon: NotebookPen },
  { to: '/reports', label: 'Reportes', icon: BarChart3 },
  { to: '/settings', label: 'Configuración', icon: Settings },
]

const ROLE_LABEL = { superadmin: 'Superadmin', owner: 'Dueño', staff: 'Personal' } as const

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-ink text-marigold">
        <Store size={20} aria-hidden="true" />
      </span>
      <span className="font-display-m text-[1.25rem] font-bold text-ink">MiniOS</span>
    </div>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Módulos" className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex h-11 items-center gap-2.5 rounded-xl px-3 text-[0.9375rem] transition-colors ${
              isActive ? 'bg-brand-tint font-bold text-brand' : 'font-medium text-ink hover:bg-paper'
            }`
          }
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function ConoceLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <NavLink
      to="/control/conoce"
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex h-11 items-center gap-2.5 rounded-xl px-3 text-[0.9375rem] font-semibold ${
          isActive ? 'bg-brand-tint text-brand' : 'border border-dashed border-hair-strong text-ink hover:bg-paper'
        }`
      }
    >
      <Info size={18} className="text-brand" aria-hidden="true" />
      Conoce la app
    </NavLink>
  )
}

/** Área admin (Panel de Control, Conoce la app, módulos) en el sistema «Mostrador». */
export function AppShell() {
  const { profile } = useAuth()
  const [menu, setMenu] = useState(false)
  const name = profile?.full_name || 'Usuario'

  return (
    <div className="mostrador min-h-[100dvh] bg-paper">
      {/* Sidebar — tablet y escritorio */}
      <aside aria-label="Menú" className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col gap-5 border-r border-hair bg-white px-3.5 py-5 md:flex">
        <Brand />
        <Link to="/app" className="flex h-10 items-center gap-2 rounded-xl bg-ink px-3 text-[0.875rem] font-semibold text-white hover:bg-[#2a302c]">
          <ArrowLeft size={16} className="text-marigold" aria-hidden="true" />
          <span className="flex-1">Volver a la app</span>
          <Smartphone size={15} className="text-[#9aa59f]" aria-hidden="true" />
        </Link>
        <NavList />
        <div className="mt-auto flex flex-col gap-2.5">
          <ConoceLink />
          <div className="flex items-center gap-2.5 rounded-xl bg-paper px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[0.875rem] font-bold text-white" aria-hidden="true">
              {name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.875rem] font-semibold text-ink">{name}</span>
              <span className="block text-[0.75rem] text-ink-2">{profile ? ROLE_LABEL[profile.role] : ''} · v0.1</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Barra superior — celular */}
      <header className="sticky top-0 z-30 border-b border-hair bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Brand />
          <button
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="admin-menu"
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-paper"
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menu && (
          <div id="admin-menu" className="flex flex-col gap-2 border-t border-hair px-3 pt-2 pb-3">
            <NavList onNavigate={() => setMenu(false)} />
            <ConoceLink onNavigate={() => setMenu(false)} />
          </div>
        )}
      </header>

      <main className="px-4 pt-5 pb-24 sm:px-6 md:ml-[232px] md:px-[clamp(16px,3vw,40px)] md:pt-7 md:pb-12">
        <Outlet />
      </main>

      {/* «Volver a la app» flotante — celular */}
      <Link
        to="/app"
        className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-[18px] text-[0.875rem] font-semibold whitespace-nowrap text-white shadow-[0_8px_24px_-10px_rgba(27,31,28,.5)] md:hidden"
      >
        <ArrowLeft size={16} className="text-marigold" aria-hidden="true" />
        Volver a la app
      </Link>
    </div>
  )
}
