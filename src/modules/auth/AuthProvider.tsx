import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContext, type AuthValue, type Profile } from './context'

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', userId)
    .maybeSingle()
  return (data as Profile) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) setProfile(await fetchProfile(data.session.user.id))
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      // La sesión inicial ya la carga getSession(); al renovar el token el perfil no cambia.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
      setProfile(s?.user ? await fetchProfile(s.user.id) : null)
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value: AuthValue = {
    session,
    profile,
    loading,
    signInWithOtp: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      })
      return { error: error?.message ?? null }
    },
    signInWithPassword: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password })
      return { error: error?.message ?? null }
    },
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
