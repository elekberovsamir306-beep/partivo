import 'server-only'
import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { serverEnv } from '@/lib/env.server'

/** Client IP as reported by the hosting proxy (Vercel sets x-forwarded-for / x-real-ip). */
export async function clientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || h.get('x-real-ip') || '0.0.0.0'
}

/** Salted, non-reversible fingerprint. Raw IP addresses are never stored. */
export async function viewerFingerprint(scope: string): Promise<string> {
  const h = await headers()
  const ip = await clientIp()
  const salt = serverEnv().IP_HASH_SALT ?? 'partivo-dev-salt-change-me'
  return createHash('sha256')
    .update(`${salt}|${scope}|${ip}|${h.get('user-agent') ?? ''}`)
    .digest('hex')
    .slice(0, 32)
}
