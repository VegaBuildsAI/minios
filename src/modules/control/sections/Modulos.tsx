import { modules } from '@/config/solution-map'
import { SectionHeader } from '@/components/SectionHeader'
import { ModuleCard } from '@/components/ModuleCard'

export function Modulos() {
  return (
    <section id="modulos" className="scroll-mt-20">
      <SectionHeader
        label="Módulos"
        title="Todo lo que el minisúper necesita"
        desc="Siete módulos cubren el ciclo completo — de la caja al inventario, proveedores, bitácora, reportes y una capa de IA transversal."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <ModuleCard key={m.id} module={m} />
        ))}
      </div>
    </section>
  )
}
