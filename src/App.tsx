import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'
import { MobileApp } from '@/modules/app/MobileApp'
import { Home } from '@/modules/app/screens/Home'
import { Assistant } from '@/modules/app/screens/Assistant'
import { Alerta } from '@/modules/app/screens/Alerta'
import { Mas } from '@/modules/app/screens/Mas'
import { Inventario } from '@/modules/app/screens/Inventario'
import { Ventas } from '@/modules/app/screens/Ventas'
import { Caja } from '@/modules/app/screens/Caja'
import { Proveedores } from '@/modules/app/screens/Proveedores'
import { Bitacora } from '@/modules/app/screens/Bitacora'
import { Reportes } from '@/modules/app/screens/Reportes'
import { Config } from '@/modules/app/screens/Config'
import { Login } from '@/modules/auth/Login'
import { RequireAuth } from '@/modules/auth/RequireAuth'
import { RequireOwner } from '@/modules/auth/RequireOwner'

// Área admin (escritorio): se descarga solo al entrar, la app móvil no la carga.
const ControlPanel = lazy(() => import('@/modules/control/ControlPanel').then((m) => ({ default: m.ControlPanel })))
const ConoceApp = lazy(() => import('@/modules/control/ConoceApp').then((m) => ({ default: m.ConoceApp })))

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Todo lo demás requiere sesión */}
      <Route element={<RequireAuth />}>
        {/* App de usuario en celular (estilo XO) */}
        <Route path="/app" element={<MobileApp />}>
          <Route index element={<Home />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="alerta" element={<Alerta />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="bitacora" element={<Bitacora />} />
          <Route path="reports" element={<Reportes />} />
          <Route path="config" element={<Config />} />
          <Route path="mas" element={<Mas />} />
        </Route>
        {/* Pantallas completas de la app */}
        <Route path="/app/assistant" element={<Assistant />} />
        <Route path="/app/caja" element={<Caja />} />

        {/* Panel de Control + módulos (área admin: dueño y superadmin) */}
        <Route element={<RequireOwner />}>
          <Route element={<AppShell />}>
            <Route
              path="/control"
              element={
                <Suspense fallback={null}>
                  <ControlPanel />
                </Suspense>
              }
            />
            <Route
              path="/control/conoce"
              element={
                <Suspense fallback={null}>
                  <ConoceApp />
                </Suspense>
              }
            />
            <Route path="/pos" element={<ModulePlaceholder code="pos" />} />
            <Route path="/inventory" element={<ModulePlaceholder code="inventory" />} />
            <Route path="/suppliers" element={<ModulePlaceholder code="suppliers" />} />
            <Route path="/bitacora" element={<ModulePlaceholder code="bitacora" />} />
            <Route path="/reports" element={<ModulePlaceholder code="reports" />} />
            <Route path="/settings" element={<ModulePlaceholder code="settings" />} />
          </Route>
        </Route>
      </Route>

      <Route index element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
