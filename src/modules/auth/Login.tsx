import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Loader2, LogIn, Mail, MailCheck, Store } from 'lucide-react'
import { useAuth } from './context'

type Mode = 'password' | 'magic'

export function Login() {
  const { signInWithPassword, signInWithOtp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('admin@minios.test')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signInWithPassword(email.trim(), password)
    setBusy(false)
    if (error) setError(error === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error)
    else navigate('/app', { replace: true })
  }

  const submitMagic = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signInWithOtp(email.trim())
    setBusy(false)
    if (error) setError(error)
    else setSent(true)
  }

  return (
    <div className="mostrador flex min-h-[100dvh] items-center justify-center bg-paper px-4 text-ink">
      <div className="w-full max-w-sm rounded-[20px] border border-hair bg-white p-7 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-marigold"><Store size={28} aria-hidden="true" /></div>
          <h1 className="font-display-m text-[1.75rem] font-bold text-ink">
            Mini<span className="text-brand">OS</span>
          </h1>
          <p className="mt-1 text-[0.9375rem] text-ink-2">Mini-ERP para minisúper</p>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-brand-tint p-5 text-center">
            <MailCheck size={32} className="mx-auto mb-2 text-brand" />
            <p className="text-[0.9375rem] font-semibold text-ink">Revisá tu correo</p>
            <p className="mt-1 text-[0.875rem] text-ink-2">
              Te enviamos un enlace mágico a <b>{email}</b>. Ábrelo para entrar.
            </p>
            <button onClick={() => { setSent(false); setMode('password') }} className="mt-3 text-[0.875rem] font-semibold text-brand">
              Volver
            </button>
          </div>
        ) : mode === 'password' ? (
          <form onSubmit={submitPassword} className="space-y-3">
            <div>
              <label className="mb-1 block text-[0.875rem] font-medium text-ink-2">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-2xl border border-hair-strong bg-white px-4 py-3 text-[0.9375rem] outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint"
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.875rem] font-medium text-ink-2">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="w-full rounded-2xl border border-hair-strong bg-white px-4 py-3 text-[0.9375rem] outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-[0.9375rem] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />}
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            {error && <p className="text-[0.875rem] text-danger">{error}</p>}
            <button
              type="button"
              onClick={() => { setMode('magic'); setError(null) }}
              className="flex w-full items-center justify-center gap-1.5 pt-1 text-center text-[0.875rem] font-semibold text-brand"
            >
              <Mail size={14} /> Entrar con enlace mágico
            </button>
          </form>
        ) : (
          <form onSubmit={submitMagic} className="space-y-3">
            <div>
              <label className="mb-1 block text-[0.875rem] font-medium text-ink-2">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-2xl border border-hair-strong bg-white px-4 py-3 text-[0.9375rem] outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-[0.9375rem] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />}
              {busy ? 'Enviando…' : 'Enviar enlace mágico'}
            </button>
            {error && <p className="text-[0.875rem] text-danger">{error}</p>}
            <button
              type="button"
              onClick={() => { setMode('password'); setError(null) }}
              className="flex w-full items-center justify-center gap-1.5 pt-1 text-center text-[0.875rem] font-semibold text-brand"
            >
              <KeyRound size={14} /> Entrar con contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
