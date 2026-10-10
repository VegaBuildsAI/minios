import { useEffect, useState } from 'react'
import { Check, KeyRound, Sparkles, Store, Users } from 'lucide-react'
import { Card, Chip, ProgressBar, ScreenHeader, Switch } from '../components'
import { useAiSpendToday, useAiUsageSummary, useBusinessSettings, useProfiles, useUpdateProfileRole, useUpdateSettings } from '@/lib/data'
import { useAuth } from '@/modules/auth/context'

const ROLES = ['superadmin', 'owner', 'staff']

export function Config() {
  const { profile, updatePassword } = useAuth()
  const isOwnerUp = profile?.role === 'owner' || profile?.role === 'superadmin'
  const [pw, setPw] = useState('')
  const [pwState, setPwState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [pwError, setPwError] = useState<string | null>(null)

  const savePassword = async () => {
    if (pw.length < 6) {
      setPwError('La contraseña debe tener al menos 6 caracteres.')
      setPwState('error')
      return
    }
    setPwState('saving')
    setPwError(null)
    const { error } = await updatePassword(pw)
    if (error) {
      setPwError(error)
      setPwState('error')
    } else {
      setPw('')
      setPwState('done')
      setTimeout(() => setPwState('idle'), 2500)
    }
  }
  const { data: settings } = useBusinessSettings()
  const updateSettings = useUpdateSettings()
  const { data: profiles = [] } = useProfiles()
  const updateRole = useUpdateProfileRole()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [taxRate, setTaxRate] = useState('13')
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC')
  const [saved, setSaved] = useState(false)
  const [aiOn, setAiOn] = useState(true)
  const [budget, setBudget] = useState('2')
  const { data: spendToday = 0 } = useAiSpendToday()
  const { data: usage } = useAiUsageSummary()

  useEffect(() => {
    if (settings) {
      setName(settings.name)
      setPhone(settings.phone ?? '')
      setAddress(settings.address ?? '')
      setTaxRate(String(Math.round(settings.tax_rate * 100)))
      setCurrency(settings.currency)
      setAiOn(settings.ai_enabled)
      setBudget(String(settings.ai_daily_budget_usd))
    }
  }, [settings])

  const save = async () => {
    await updateSettings.mutateAsync({
      name,
      phone,
      address,
      tax_rate: (Number(taxRate) || 0) / 100,
      currency,
      ai_enabled: aiOn,
      ai_daily_budget_usd: Math.max(0, Number(budget) || 0),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <ScreenHeader title="Configuración" subtitle="Negocio, impuestos y usuarios." />

      {/* Negocio */}
      <div className="mb-2 flex items-center gap-2 px-0.5 text-base font-bold text-ink">
        <Store size={16} className="text-brand" /> Perfil del negocio
      </div>
      <Card className="mb-5 space-y-3 p-4">
        <Field label="Nombre" value={name} onChange={setName} disabled={!isOwnerUp} />
        <Field label="Teléfono" value={phone} onChange={setPhone} disabled={!isOwnerUp} />
        <Field label="Dirección" value={address} onChange={setAddress} disabled={!isOwnerUp} />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[0.8125rem] font-medium text-ink-2">IVA (%)</label>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              disabled={!isOwnerUp}
              className="w-full h-11 rounded-xl border border-hair-strong bg-white px-3 text-[0.9375rem] outline-none focus:border-brand disabled:bg-paper"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[0.8125rem] font-medium text-ink-2">Moneda</label>
            <div className="flex gap-1.5">
              {(['CRC', 'USD'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => isOwnerUp && setCurrency(c)}
                  disabled={!isOwnerUp}
                  className={`h-11 flex-1 rounded-xl text-[0.875rem] font-semibold ${
                    currency === c ? 'bg-ink text-white' : 'border border-hair-strong bg-white text-ink'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        {isOwnerUp && (
          <button
            onClick={save}
            disabled={updateSettings.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-brand text-[0.9375rem] font-bold text-white disabled:opacity-60"
          >
            {saved ? <Check size={17} /> : null}
            {saved ? 'Guardado' : updateSettings.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
      </Card>

      {/* IA */}
      <div className="mb-2 flex items-center gap-2 px-0.5 text-base font-bold text-ink">
        <Sparkles size={16} className="text-brand" /> Inteligencia artificial
      </div>
      <Card className="mb-5 space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.9375rem] font-semibold text-ink">
            Lectura y asistente con IA
            <span className="block text-[0.8125rem] font-normal text-ink-2">Si la apagás, los archivos se guardan igual pero no se leen.</span>
          </span>
          <Switch checked={aiOn} onChange={(v) => isOwnerUp && setAiOn(v)} label="Lectura y asistente con IA" />
        </div>
        <div>
          <div className="tabular-nums mb-1.5 flex justify-between text-[0.875rem]">
            <span className="font-semibold text-ink">Gasto de hoy</span>
            <span>
              <b className="text-ink">US${spendToday.toFixed(2)}</b> <span className="text-ink-2">de US${(Number(budget) || 0).toFixed(2)}</span>
            </span>
          </div>
          <ProgressBar pct={Number(budget) > 0 ? (spendToday / Number(budget)) * 100 : 0} tone={Number(budget) > 0 && spendToday / Number(budget) > 0.8 ? 'warn' : 'brand'} height="h-2" />
        </div>
        <div>
          <label className="mb-1 block text-[0.8125rem] font-medium text-ink-2">Tope de gasto diario (US$)</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            disabled={!isOwnerUp}
            className="w-full h-11 rounded-xl border border-hair-strong bg-white px-3 text-[0.9375rem] outline-none focus:border-brand disabled:bg-paper"
          />
        </div>
        <div className="flex gap-3 text-[0.8125rem] text-ink-2">
          {isOwnerUp && usage && (
            <span>
              30 días: <b className="tabular-nums text-ink">US${usage.total.toFixed(2)}</b> · {usage.calls} llamadas
            </span>
          )}
        </div>
        {isOwnerUp && <p className="text-[0.8125rem] text-ink-3">Se guarda con el botón "Guardar cambios" del perfil del negocio.</p>}
      </Card>

      {/* Contraseña */}
      <div className="mb-2 flex items-center gap-2 px-0.5 text-base font-bold text-ink">
        <KeyRound size={16} className="text-brand" /> Tu contraseña
      </div>
      <Card className="mb-5 p-4">
        <p className="mb-2 text-[0.875rem] text-ink-2">
          Definí una contraseña para entrar sin depender del correo (ideal para el celular).
        </p>
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Nueva contraseña (mín. 6)"
            className="flex-1 h-12 rounded-[14px] border border-hair-strong bg-white px-3.5 text-[0.9375rem] outline-none focus:border-brand"
          />
          <button
            onClick={savePassword}
            disabled={pwState === 'saving'}
            className="flex h-12 items-center gap-1.5 rounded-[14px] bg-brand px-4 text-[0.9375rem] font-semibold text-white disabled:opacity-60"
          >
            {pwState === 'done' ? <Check size={16} /> : null}
            {pwState === 'saving' ? 'Guardando…' : pwState === 'done' ? 'Guardada' : 'Guardar'}
          </button>
        </div>
        {pwError && <p className="mt-2 text-[0.875rem] text-danger">{pwError}</p>}
      </Card>

      {/* Usuarios */}
      <div className="mb-2 flex items-center gap-2 px-0.5 text-base font-bold text-ink">
        <Users size={16} className="text-brand" /> Usuarios y roles
      </div>
      <Card className="divide-y divide-hair">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tint text-sm font-bold text-brand">
              {(p.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[0.9375rem] font-semibold text-ink">{p.full_name || 'Usuario'}</div>
            </div>
            {isOwnerUp ? (
              <select
                value={p.role}
                onChange={(e) => updateRole.mutate({ id: p.id, role: e.target.value })}
                className="rounded-lg border border-hair-strong px-2 py-1 text-[0.875rem] capitalize outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <Chip>{p.role}</Chip>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-[0.8125rem] font-medium text-ink-2">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-11 rounded-xl border border-hair-strong bg-white px-3 text-[0.9375rem] outline-none focus:border-brand disabled:bg-paper"
      />
    </div>
  )
}
