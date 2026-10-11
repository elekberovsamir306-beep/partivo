/**
 * Public configuration. Only NEXT_PUBLIC_* values may appear here: they are inlined into client bundles.
 * Server secrets live in env.server.ts, which is guarded by "server-only".
 */
const DEFAULT_SITE_URL = 'http://localhost:3000'

export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, ''),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  phoneVerificationEnabled: process.env.NEXT_PUBLIC_PHONE_VERIFICATION === 'true',
} as const

export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey)
}

export function absoluteUrl(path = '/') {
  return `${publicEnv.siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}
