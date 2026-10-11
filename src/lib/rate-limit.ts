import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { viewerFingerprint } from '@/lib/request'

export const LIMITS = {
  login: { max: 10, windowSeconds: 600 },
  register: { max: 5, windowSeconds: 3600 },
  passwordReset: { max: 5, windowSeconds: 3600 },
  listingCreate: { max: 20, windowSeconds: 3600 },
  imageUpload: { max: 120, windowSeconds: 3600 },
  report: { max: 10, windowSeconds: 3600 },
  contactReveal: { max: 40, windowSeconds: 3600 },
  support: { max: 5, windowSeconds: 3600 },
  checkout: { max: 10, windowSeconds: 600 },
} as const

export type LimitName = keyof typeof LIMITS

/**
 * Fixed-window limiter backed by Postgres so it works across serverless instances.
 * Keyed by user id when known, otherwise by a salted IP fingerprint.
 * Fails open (allows) only if the limiter itself is unavailable, and logs the problem.
 */
export async function rateLimit(name: LimitName, userId?: string | null): Promise<boolean> {
  const { max, windowSeconds } = LIMITS[name]
  const subject = userId ? `u:${userId}` : `ip:${await viewerFingerprint('rl')}`
  try {
    const { data, error } = await createAdminClient().rpc('rate_limit_hit', {
      bucket: `${name}:${subject}`,
      max_hits: max,
      window_seconds: windowSeconds,
    })
    if (error) throw error
    return data === true
  } catch (error) {
    console.error('[rate-limit] unavailable', error)
    return true
  }
}
