import { Link } from 'react-router-dom'
import { BarChart3, Bell, ChevronRight, LayoutDashboard, LogOut, Mic, NotebookPen, Package, Settings, ShoppingCart, Truck, type LucideIcon } from 'lucide-react'
import { Card, ScreenHeader } from '../components'
import { useAuth } from '@/modules/auth/context'

interface Tile {
  icon: LucideIcon
  name: string
  to?: string
  soon?: boolean
}

const TILES: Tile[] = [
  { icon: ShoppingCart, name: 'Caja', to: '/app/caja' },
  { icon: Package, name: 'Inventario', to: '/app/inventario' },
  { icon: Mic, name: 'Asistente IA', to: '/app/assistant' },
  { icon: Bell, name: 'Alertas', to: '/app/alerta' },
  { icon: Truck, name: 'Proveedores', to: '/app/proveedores' },
  { icon: NotebookPen, name: 'Bitácora', to: '/app/bitacora' },
  { icon: BarChart3, name: 'Reportes', to: '/app/reports' },
  { icon: Settings, name: 'Configuración', to: '/app/config' },
]

function TileCard({ tile }: { tile: Tile }) {
  const body = (
    <Card className="flex flex-col items-start gap-2 p-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-tint text-brand">
        <tile.icon size={22} aria-hidden="true" />
      </span>
      <span className="text-[0.9375rem] font-semibold text-ink">{tile.name}</span>
      {tile.soon && <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[0.8125rem] font-semibold text-ink-3">Pronto</span>}
    </Card>
  )
  if (tile.to) return <Link to={tile.to}>{body}</Link>
  return <div className="opacity-70">{body}</div>
}

export function Mas() {
  const { profile, signOut } = useAuth()
  return (
    <div>
      <ScreenHeader title="Más" subtitle="Todos los módulos de MiniOS." />

      {profile && (
        <Card className="mb-4 flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-sm font-bold text-brand">
            {(profile.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-[0.9375rem] font-semibold text-ink">{profile.full_name || 'Usuario'}</div>
            <div className="text-[0.8125rem] capitalize text-ink-2">{profile.role}</div>
          </div>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-full bg-danger-tint h-9 px-3.5 text-[0.875rem] font-semibold text-danger"
          >
            <LogOut size={14} /> Salir
          </button>
        </Card>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3">
        {TILES.map((t) => (
          <TileCard key={t.name} tile={t} />
        ))}
      </div>

      <Link to="/control">
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
            <LayoutDashboard size={20} />
          </span>
          <div className="flex-1">
            <div className="text-[0.9375rem] font-semibold text-ink">Panel de Control</div>
            <div className="text-[0.8125rem] text-ink-2">Vista admin · superadmin</div>
          </div>
          <ChevronRight size={18} className="text-ink-3" />
        </Card>
      </Link>
    </div>
  )
}
