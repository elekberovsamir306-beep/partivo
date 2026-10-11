import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { publicEnv, isSupabaseConfigured } from '@/lib/env'

/** Refreshes the Supabase session cookie on every request and returns the signed-in user id, if any. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (!isSupabaseConfigured()) return { response, userId: null as string | null }

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value)
      },
    },
  })

  // getClaims() validates the JWT signature; do not replace with getSession() for authorization.
  const { data } = await supabase.auth.getClaims()
  return { response, userId: (data?.claims?.sub as string | undefined) ?? null }
}
