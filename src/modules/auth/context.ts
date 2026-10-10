import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type Role = 'superadmin' | 'owner' | 'staff'

export interface Profile {
  id: string
  full_name: string
  role: Role
  is_active: boolean
}

export interface AuthValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signInWithOtp: (email: string) => Promise<{ error: string | null }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
