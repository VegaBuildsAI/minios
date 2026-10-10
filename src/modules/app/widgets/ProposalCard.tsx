import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useApplyProposal, useCaptures } from '@/lib/data'
import { formatCRC, type Proposal } from '@/lib/types'
import { useAuth } from '@/modules/auth/context'
import { ReceiveInvoice } from './ReceiveInvoice'

/** Tarjeta de una propuesta del asistente: nada se aplica hasta que el usuario confirma. */
export function ProposalCard({ p }: { p: Proposal }) {
  const { profile } = useAuth()
  const canApply = profile?.role === 'owner' || profile?.role === 'superadmin'
  const apply = useApplyProposal()
  const { data: captures = [] } = useCaptures()
  const [done, setDone] = useState(false)

  if (p.kind === 'receive_invoice') {
    const cap = captures.find((c) => c.id === p.captura_id)
    return (
      <div className="mt-2.5 rounded-[18px] border-2 border-brand bg-white p-3.5">
        <div className="text-[0.875rem] font-semibold text-ink">{p.resumen}</div>
        {cap ? <ReceiveInvoice capture={cap} /> : <p className="mt-1 text-[0.8125rem] text-ink-3">No encontré ese documento en la Bitácora.</p>}
      </div>
    )
  }

  return (
    <div className="mt-2.5 rounded-[18px] border-2 border-brand bg-white p-3.5">
      <div className="mb-1 text-[0.8125rem] font-semibold uppercase tracking-wide text-brand">
        {p.kind === 'stock_adjust' ? 'Ajuste de inventario' : 'Orden de compra (borrador)'}
      </div>
      <div className="text-[0.875rem] text-ink">{p.resumen}</div>
      {p.kind === 'purchase_order' && (
        <ul className="mt-1.5 space-y-0.5 text-[0.8125rem] text-ink-2">
          {p.items.map((i) => (
            <li key={i.producto_id}>
              {i.cantidad} × {i.producto} · {formatCRC(i.costo)}
            </li>
          ))}
          <li className="pt-0.5 font-semibold text-ink">Total {formatCRC(p.total)}</li>
        </ul>
      )}
      {done ? (
        <div className="mt-2 flex items-center gap-1.5 text-[0.8125rem] font-medium text-brand">
          <Check size={14} /> Aplicado
        </div>
      ) : !canApply ? (
        <p className="mt-2 text-[0.8125rem] text-warn">Solo el dueño o el superadmin puede aplicar esto.</p>
      ) : (
        <button
          onClick={() => apply.mutate(p, { onSuccess: () => setDone(true) })}
          disabled={apply.isPending}
          className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-brand text-[0.9375rem] font-bold text-white disabled:opacity-60"
        >
          {apply.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirmar
        </button>
      )}
      {apply.isError && <p className="mt-1.5 text-[0.8125rem] text-danger">{(apply.error as Error).message}</p>}
    </div>
  )
}
