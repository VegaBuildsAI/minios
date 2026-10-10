import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  ChevronRight,
  HandCoins,
  Loader2,
  Receipt,
  ShoppingBasket,
  Truck,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  uploadBitacoraFile,
  useAddCashMovement,
  useCloseShiftMutation,
  useCreateCapture,
  useOpenShift,
  useOpenShiftMutation,
  useParseCapture,
  useShiftCash,
  useSuppliers,
  useTodayCashMovements,
  useTodaySales,
  useUpdateCapture,
} from '@/lib/data'
import { formatCRC, type CashKind, type PaymentMethod } from '@/lib/types'
import { Card, Eyebrow } from '../components'
import { TICKET_MARK, usePendingTickets } from '@/lib/tickets'
import { TicketSheet } from '../widgets/TicketSheet'
import { fmtTime } from '@/lib/time'

const PAY_LABEL: Record<PaymentMethod, string> = { efectivo: 'Efectivo', sinpe: 'SINPE', tarjeta: 'Tarjeta', fiado: 'Fiado' }

const KIND: Record<CashKind, { label: string; icon: LucideIcon; out: boolean; hint: string }> = {
  gasto: { label: 'Gasto', icon: ShoppingBasket, out: true, hint: 'Ej. productos de limpieza' },
  pago_proveedor: { label: 'Pago a proveedor', icon: Truck, out: true, hint: 'Ej. factura 1234' },
  retiro: { label: 'Retiro del dueño', icon: HandCoins, out: true, hint: 'Opcional' },
  ingreso: { label: 'Entrada de efectivo', icon: Wallet, out: false, hint: 'Ej. fondo para cambio' },
}

const time = (iso: string) => fmtTime(iso)

export function Caja() {
  const navigate = useNavigate()
  const { data: shift } = useOpenShift()
  const { data: sales = [] } = useTodaySales()
  const { data: cash = [] } = useTodayCashMovements()
  const pending = usePendingTickets()
  const createCapture = useCreateCapture()
  const parse = useParseCapture()
  const archive = useUpdateCapture()
  const fileRef = useRef<HTMLInputElement>(null)

  const [ticketId, setTicketId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [cashSheet, setCashSheet] = useState(false)
  const [turnoSheet, setTurnoSheet] = useState(false)

  // Con turno abierto se cuadra el turno (aunque cruce la medianoche); sin turno, el día.
  const { data: sc } = useShiftCash(shift)
  const dayCashSales = sales.filter((s) => s.payment_method === 'efectivo').reduce((a, s) => a + Number(s.total), 0)
  const dayIns = cash.filter((m) => !KIND[m.kind].out).reduce((a, m) => a + Number(m.amount), 0)
  const dayOuts = cash.filter((m) => KIND[m.kind].out).reduce((a, m) => a + Number(m.amount), 0)
  const cashSales = shift ? (sc?.cashSales ?? 0) : dayCashSales
  const ins = shift ? (sc?.ins ?? 0) : dayIns
  const outs = shift ? (sc?.outs ?? 0) : dayOuts
  const expected = (shift?.opening_cash ?? 0) + cashSales + ins - outs
  const salesTotal = sales.reduce((a, s) => a + Number(s.total), 0)

  const onPhoto = async (files: FileList | null) => {
    const f = files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!f) return
    setUploadErr(null)
    setUploading(true)
    try {
      const file = await uploadBitacoraFile(f)
      const id = await createCapture.mutateAsync({ type: 'file', category: 'caja', rawInput: TICKET_MARK, file })
      setTicketId(id)
      parse.mutate({ id })
    } catch (e) {
      setUploadErr((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const feed = [
    ...sales.map((s) => ({
      id: s.id,
      at: s.created_at,
      icon: Receipt,
      title: s.ticket_number ? `Tiquete N.° ${s.ticket_number}` : 'Tiquete',
      sub: `${s.itemCount} producto${s.itemCount === 1 ? '' : 's'} · ${PAY_LABEL[s.payment_method]}`,
      amount: Number(s.total),
      out: false,
    })),
    ...cash.map((m) => ({
      id: m.id,
      at: m.created_at,
      icon: KIND[m.kind].icon,
      title: KIND[m.kind].label,
      sub: m.note ?? 'Efectivo',
      amount: Number(m.amount),
      out: KIND[m.kind].out,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div className="mostrador fixed inset-0 z-50 mx-auto flex max-w-[440px] flex-col bg-paper text-ink">
      <header className="flex items-center gap-2.5 border-b border-hair bg-white px-3 py-3">
        <button onClick={() => navigate('/app')} aria-label="Volver al inicio" className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-paper-2">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="font-display-m text-[1.375rem] leading-tight font-bold text-ink">Caja</h1>
          <div className="text-[0.8125rem] text-ink-2">{shift ? `Turno abierto desde las ${time(shift.opened_at)}` : 'Sin turno abierto'}</div>
        </div>
        <button
          onClick={() => setTurnoSheet(true)}
          className={`flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[0.875rem] font-semibold ${
            shift ? 'border-hair bg-white text-ink' : 'border-warn-tint bg-warn-tint text-warn'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${shift ? 'bg-ok' : 'bg-warn'}`} aria-hidden="true" /> {shift ? 'Cerrar turno' : 'Abrir turno'}
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Efectivo en caja */}
        <section className="rounded-[22px] bg-brand p-4 text-white">
          <div className="text-[0.8125rem] font-semibold opacity-85">Efectivo en caja</div>
          <div className="font-display-m tabular-nums text-[2.25rem] leading-tight font-bold">{formatCRC(expected)}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[0.8125rem]">
            <Stat label="Apertura" value={formatCRC(shift?.opening_cash ?? 0)} />
            <Stat label="Entradas" value={`+${formatCRC(cashSales + ins)}`} />
            <Stat label="Salidas" value={`−${formatCRC(outs)}`} />
          </div>
          <div className="mt-3 border-t border-white/20 pt-2 text-[0.8125rem] opacity-90">
            Ventas de hoy: <span className="tabular-nums font-semibold">{formatCRC(salesTotal)}</span> en {sales.length} tiquete{sales.length === 1 ? '' : 's'}
          </div>
        </section>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex min-h-[88px] flex-col items-start justify-between rounded-[18px] bg-ink p-3.5 text-left text-white disabled:opacity-60"
          >
            {uploading ? <Loader2 size={22} className="animate-spin text-marigold" /> : <Camera size={22} className="text-marigold" aria-hidden="true" />}
            <span className="text-[0.9375rem] font-bold">{uploading ? 'Subiendo foto…' : 'Registrar tiquete'}</span>
          </button>
          <button onClick={() => setCashSheet(true)} className="flex min-h-[88px] flex-col items-start justify-between rounded-[18px] border border-hair bg-white p-3.5 text-left">
            <ArrowUpRight size={22} className="text-danger" aria-hidden="true" />
            <span className="text-[0.9375rem] font-bold text-ink">Salida o entrada de efectivo</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onPhoto(e.target.files)} className="hidden" />
        {uploadErr && <p className="text-[0.875rem] text-danger">{uploadErr}</p>}

        {/* Tiquetes sin registrar */}
        {pending.length > 0 && (
          <div>
            <Eyebrow className="mb-2">Tiquetes por registrar</Eyebrow>
            <Card className="overflow-hidden">
              {pending.map((c) => (
                <div key={c.id} className="flex items-center gap-2 border-b border-paper-2 px-3.5 py-2.5 last:border-b-0">
                  <button onClick={() => setTicketId(c.id)} className="flex min-h-11 flex-1 items-center gap-2.5 text-left">
                    <Receipt size={18} className="text-warn" aria-hidden="true" />
                    <span className="flex-1">
                      <span className="block text-[0.9375rem] font-semibold text-ink">Foto de las {time(c.created_at)}</span>
                      <span className="block text-[0.8125rem] text-ink-2">
                        {c.ai_status === 'procesando' ? 'Leyendo…' : c.ai_status === 'error' ? 'No se pudo leer' : 'Falta enrutar productos'}
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-ink-3" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => archive.mutate({ id: c.id, status: 'archivado' })}
                    aria-label="Descartar foto"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 hover:bg-paper-2"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Movimientos */}
        <div>
          <Eyebrow className="mb-2">Movimientos de hoy</Eyebrow>
          <Card className="overflow-hidden">
            {feed.length === 0 && <p className="px-4 py-8 text-center text-[0.9375rem] text-ink-2">Todavía no hay movimientos. Tomale foto al primer tiquete.</p>}
            {feed.map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-paper-2 px-3.5 py-3 last:border-b-0">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.out ? 'bg-danger-tint text-danger' : 'bg-brand-tint text-brand'}`}>
                  <r.icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-semibold text-ink">{r.title}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-2">
                    {time(r.at)} · {r.sub}
                  </span>
                </span>
                <span className={`tabular-nums flex items-center gap-0.5 text-[0.9375rem] font-bold ${r.out ? 'text-danger' : 'text-brand'}`}>
                  {r.out ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownLeft size={14} aria-hidden="true" />}
                  {r.out ? '−' : '+'}
                  {formatCRC(r.amount)}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {ticketId && <TicketSheet captureId={ticketId} shiftId={shift?.id ?? null} onClose={() => setTicketId(null)} />}
      {cashSheet && <CashSheet shiftId={shift?.id ?? null} onClose={() => setCashSheet(false)} />}
      {turnoSheet && (
        <TurnoSheet
          expected={expected}
          breakdown={{ opening: shift?.opening_cash ?? 0, cashSales, ins, outs }}
          shiftId={shift?.id ?? null}
          onClose={() => setTurnoSheet(false)}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="opacity-75">{label}</div>
      <div className="tabular-nums truncate font-semibold">{value}</div>
    </div>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div className="max-h-[90%] overflow-y-auto rounded-t-[22px] bg-white p-4 pb-[max(env(safe-area-inset-bottom),1rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[1.125rem] font-bold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const field = 'w-full h-12 rounded-[14px] border border-hair-strong bg-white px-3.5 text-[0.9375rem] outline-none focus:border-brand'

function CashSheet({ shiftId, onClose }: { shiftId: string | null; onClose: () => void }) {
  const add = useAddCashMovement()
  const { data: suppliers = [] } = useSuppliers()
  const [kind, setKind] = useState<CashKind>('gasto')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const n = Number(amount) || 0

  const save = async () => {
    const supplier = suppliers.find((s) => s.id === supplierId)
    await add.mutateAsync({
      kind,
      amount: n,
      note: kind === 'pago_proveedor' && supplier ? [supplier.name, note.trim()].filter(Boolean).join(' · ') : note,
      supplierId: kind === 'pago_proveedor' ? supplierId || null : null,
      shiftId,
    })
    onClose()
  }

  return (
    <Sheet title="Movimiento de efectivo" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(KIND) as CashKind[]).map((k) => {
          const K = KIND[k]
          return (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`flex min-h-[52px] items-center gap-2 rounded-2xl border px-3 text-left text-[0.875rem] font-semibold ${
                kind === k ? 'border-2 border-brand bg-brand-tint text-brand' : 'border-hair-strong text-ink'
              }`}
            >
              <K.icon size={18} aria-hidden="true" className={kind === k ? '' : K.out ? 'text-danger' : 'text-brand'} />
              {K.label}
            </button>
          )
        })}
      </div>

      <label className="mt-3 block text-[0.8125rem] font-semibold text-ink-2">
        Monto (₡)
        <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`mt-1 ${field} tabular-nums`} />
      </label>

      {kind === 'pago_proveedor' && (
        <label className="mt-3 block text-[0.8125rem] font-semibold text-ink-2">
          Proveedor
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`mt-1 ${field}`}>
            <option value="">— Elegí el proveedor —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="mt-3 block text-[0.8125rem] font-semibold text-ink-2">
        Detalle
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={KIND[kind].hint} className={`mt-1 ${field}`} />
      </label>

      <button
        onClick={save}
        disabled={n <= 0 || add.isPending || (kind === 'pago_proveedor' && !supplierId)}
        className={`mt-4 h-14 w-full rounded-2xl text-base font-bold text-white disabled:opacity-50 ${KIND[kind].out ? 'bg-ink' : 'bg-brand'}`}
      >
        {add.isPending ? 'Guardando…' : `${KIND[kind].out ? 'Registrar salida' : 'Registrar entrada'} ${n > 0 ? formatCRC(n) : ''}`}
      </button>
      {add.isError && <p className="mt-2 text-center text-[0.875rem] text-danger">{(add.error as Error).message}</p>}
    </Sheet>
  )
}

function TurnoSheet({
  expected,
  breakdown,
  shiftId,
  onClose,
}: {
  expected: number
  breakdown: { opening: number; cashSales: number; ins: number; outs: number }
  shiftId: string | null
  onClose: () => void
}) {
  const openShift = useOpenShiftMutation()
  const closeShift = useCloseShiftMutation()
  const [amount, setAmount] = useState('')
  const diff = amount ? Number(amount) - expected : 0

  if (!shiftId) {
    return (
      <Sheet title="Abrir turno" onClose={onClose}>
        <label className="block text-[0.8125rem] font-semibold text-ink-2">
          Efectivo con el que abre la caja (₡)
          <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`mt-1 mb-3 ${field} tabular-nums`} />
        </label>
        <button
          onClick={async () => {
            await openShift.mutateAsync({ openingCash: Number(amount) || 0 })
            onClose()
          }}
          disabled={openShift.isPending}
          className="h-14 w-full rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-60"
        >
          {openShift.isPending ? 'Abriendo…' : 'Abrir turno'}
        </button>
      </Sheet>
    )
  }

  return (
    <Sheet title="Cierre de turno" onClose={onClose}>
      <div className="space-y-1 text-[0.875rem] text-ink-2">
        <Line label="Apertura" value={formatCRC(breakdown.opening)} />
        <Line label="Tiquetes en efectivo" value={`+${formatCRC(breakdown.cashSales)}`} />
        <Line label="Otras entradas" value={`+${formatCRC(breakdown.ins)}`} />
        <Line label="Salidas" value={`−${formatCRC(breakdown.outs)}`} />
      </div>
      <div className="mt-2 mb-3 flex justify-between border-t border-hair pt-2 text-[0.9375rem] font-semibold text-ink">
        <span>Efectivo esperado</span>
        <span className="tabular-nums text-brand">{formatCRC(expected)}</span>
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Efectivo contado"
        aria-label="Efectivo contado"
        className={`mb-2 ${field} tabular-nums`}
      />
      {amount && (
        <p className={`mb-2 text-[0.875rem] font-semibold ${diff === 0 ? 'text-brand' : diff < 0 ? 'text-danger' : 'text-warn'}`}>
          {diff === 0 ? 'Cuadra exacto' : diff < 0 ? `Faltante ${formatCRC(Math.abs(diff))}` : `Sobrante ${formatCRC(diff)}`}
        </p>
      )}
      <button
        onClick={async () => {
          await closeShift.mutateAsync({ shiftId, closingCash: Number(amount) || 0 })
          onClose()
        }}
        disabled={closeShift.isPending || !amount}
        className="h-14 w-full rounded-2xl bg-ink text-base font-bold text-white disabled:opacity-60"
      >
        {closeShift.isPending ? 'Cerrando…' : 'Cerrar turno'}
      </button>
    </Sheet>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
