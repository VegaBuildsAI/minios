import { flows } from '@/config/solution-map'
import { SectionHeader } from '@/components/SectionHeader'
import { FlowTrack } from '@/components/FlowTrack'

export function Flujos() {
  return (
    <section id="flujos" className="scroll-mt-20">
      <SectionHeader
        label="Flujos"
        title="Cómo se mueve la operación"
        desc="Los circuitos clave del negocio, del gesto informal al dato estructurado — con la IA cerrando cada lazo."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {flows.map((f) => (
          <FlowTrack key={f.id} flow={f} />
        ))}
      </div>
    </section>
  )
}
