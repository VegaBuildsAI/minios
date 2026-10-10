import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  NotebookPen,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

interface NavItem {
  to: string
  label: string
  short: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: '/control', label: 'Panel de Control', short: 'Panel', icon: LayoutDashboard },
  { to: '/pos', label: 'Caja', short: 'Caja', icon: ShoppingCart },
  { to: '/inventory', label: 'Inventario', short: 'Inv.', icon: Package },
  { to: '/suppliers', label: 'Proveedores', short: 'Prov.', icon: Truck },
  { to: '/bitacora', label: 'Bitácora', short: 'Bitácora', icon: NotebookPen },
  { to: '/reports', label: 'Reportes', short: 'Reportes', icon: BarChart3 },
  { to: '/settings', label: 'Configuración', short: 'Config', icon: Settings },
]

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-orange-dim text-orange">
        <span className="text-lg">🏪</span>
      </div>
      <span className="font-display text-lg font-extrabold text-fg">
        Mini<span className="text-orange">OS</span>
      </span>
    </div>
  )
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-deep text-fg">
      {/* Sidebar — tablet & desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-card px-3 py-4 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-[0.85rem] font-medium transition-colors ${
                  isActive ? 'bg-orange-dim text-orange' : 'text-fg-secondary hover:bg-surface hover:text-fg'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-line px-2 pt-3">
          <span className="text-[0.68rem] text-fg-muted">v0.1 · local</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Top bar — phone only */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-card px-4 py-3 md:hidden">
        <Brand />
        <ThemeToggle />
      </header>

      {/* Main */}
      <main className="px-4 pb-24 pt-5 sm:px-6 md:ml-60 md:pb-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav — phone only */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur md:hidden">
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map(({ to, short, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-[4.5rem] flex-1 shrink-0 flex-col items-center gap-1 px-1 py-2.5 text-[0.62rem] font-medium transition-colors ${
                  isActive ? 'text-orange' : 'text-fg-muted'
                }`
              }
            >
              <Icon size={19} />
              {short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
