import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'

let client: SupabaseClient | null = null

/**
 * Service-role client. Bypasses RLS: use only in trusted server code (payment callbacks,
 * rate limiting, cron jobs, account deletion) and never pass user-controlled filters unchecked.
 */
export function createAdminClient(): SupabaseClient {
  const key = serverEnv().SUPABASE_SERVICE_ROLE_KEY
  if (!publicEnv.supabaseUrl || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be configured')
  }
  client ??= createClient(publicEnv.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
