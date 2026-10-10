import { Activity, Lock } from 'lucide-react'
import { SectionHeader } from '@/components/SectionHeader'
import { KpiCard } from '@/components/KpiCard'
import { useAuth } from '@/modules/auth/context'
import { useAiSpendToday, useDashboardStats } from '@/lib/data'
import { supabaseReady } from '@/lib/supabase'
import { formatCRC } from '@/lib/types'

export function EnVivo() {
  const { profile } = useAuth()
  const { data: stats, isLoading, isError } = useDashboardStats()
  const { data: aiSpend = 0 } = useAiSpendToday()

  if (profile?.role !== 'superadmin') {
    return (
      <section id="en-vivo" className="scroll-mt-20">
        <SectionHeader label="Centro en vivo" title="Datos en tiempo real" />
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-card p-5 text-fg-muted">
          <Lock size={18} />
          <p className="text-[0.85rem]">Sección exclusiva del rol <b className="text-fg-secondary">superadmin</b>.</p>
        </div>
      </section>
    )
  }

  const health = supabaseReady && !isError

  return (
    <section id="en-vivo" className="scroll-mt-20">
      <SectionHeader
        label="Centro en vivo"
        title="La operación, ahora mismo"
        desc="KPIs leídos en vivo desde Supabase local. Se actualizan con cada venta y ajuste de inventario."
      />
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[0.75rem]">
        <Activity size={14} className={health ? 'text-green' : 'text-red'} />
        <span className="text-fg-secondary">
          Supabase {health ? 'conectado' : 'sin conexión'}
          {isLoading && ' · cargando…'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Ventas hoy" value={formatCRC(stats?.salesTodayTotal ?? 0)} hint={`${stats?.salesTodayCount ?? 0} tickets`} hintTone="up" accentColor="var(--accent-green)" />
        <KpiCard label="Tickets hoy" value={String(stats?.salesTodayCount ?? 0)} />
        <KpiCard
          label="Inventario crítico"
          value={String(stats?.criticalCount ?? 0)}
          hint={(stats?.criticalCount ?? 0) > 0 ? 'requiere atención' : 'todo en rango'}
          hintTone={(stats?.criticalCount ?? 0) > 0 ? 'down' : 'up'}
          accentColor="var(--accent-amber)"
        />
        <KpiCard label="Fíado pendiente" value={formatCRC(stats?.fiadoTotal ?? 0)} accentColor="var(--accent-red)" />
        <KpiCard label="Gasto IA hoy" value={`US$${aiSpend.toFixed(3)}`} hint="Haiku 4.5 · con tope diario" accentColor="var(--accent-purple)" />
        <KpiCard label="Productos" value={String(stats?.productsCount ?? 0)} accentColor="var(--accent-blue)" />
      </div>
    </section>
  )
}
