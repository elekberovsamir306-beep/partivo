import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'
import type { Permission } from '@/lib/permissions'

export interface SessionUser {
  id: string
  email: string | null
}

/** Verified current user (JWT signature checked via getClaims). Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Session-dependent output must never be prerendered, even when a build runs without Supabase env vars.
  await connection()
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null }
})

export const getViewer = cache(async () => {
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createClient()
  const [{ data: profile }, { data: permissions }, { count }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_path, seller_type, is_verified, is_suspended').eq('id', user.id).maybeSingle(),
    supabase.rpc('my_permissions'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
  ])
  return {
    ...user,
    profile: profile as {
      id: string
      display_name: string
      avatar_path: string | null
      seller_type: 'private' | 'business'
      is_verified: boolean
      is_suspended: boolean
    } | null,
    permissions: ((permissions as string[] | null) ?? []) as Permission[],
    unreadNotifications: count ?? 0,
  }
})

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>

export async function requireUser(next = '/hesab'): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect(`/giris?next=${encodeURIComponent(next)}`)
  return user
}

/** Server-side permission gate. Permissions come from staff_roles in the database, never from profile fields. */
export async function requirePermission(permission: Permission) {
  const viewer = await getViewer()
  if (!viewer) redirect('/giris?next=/admin')
  if (!viewer.permissions.includes(permission)) redirect('/admin?forbidden=1')
  return viewer
}
