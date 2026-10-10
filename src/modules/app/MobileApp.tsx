import { Outlet } from 'react-router-dom'
import { AppTabBar } from './AppTabBar'

/**
 * MobileApp — la app de usuario en celular (dueño/staff del minisúper).
 * Sistema «Mostrador»: papel cálido, tinta, verde de marca y caléndula.
 * Siempre en modo claro, independiente del tema del Panel de Control.
 */
export function MobileApp() {
  return (
    <div className="mostrador flex h-[100dvh] w-full justify-center bg-paper text-ink">
      <div className="relative flex h-full w-full max-w-[440px] flex-col bg-paper">
        <main className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6">
          <Outlet />
        </main>
        <AppTabBar />
      </div>
    </div>
  )
}
