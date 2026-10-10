import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** true cuando hay credenciales; permite fallback a datos mock si no. */
export const supabaseReady = Boolean(url && anonKey)

if (!supabaseReady) {
  // eslint-disable-next-line no-console
  console.warn('[MiniOS] Falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — usando datos de ejemplo.')
}

export const supabase = createClient(url ?? 'http://127.0.0.1:54321', anonKey ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // PKCE: el token vuelve como ?code=… (query), no en el hash — evita el
    // choque con HashRouter cuando se sirve desde Supabase Storage.
    flowType: 'pkce',
  },
})
