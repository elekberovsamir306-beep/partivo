import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env.server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentProvider, supabasePaymentRepo } from '@/lib/payments'
import { reconcilePending } from '@/lib/payments/service'

export const runtime = 'nodejs'

function authorized(request: Request) {
  const secret = serverEnv().CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/**
 * Scheduled job (Vercel Cron, see vercel.json): expires listings and promotions, sends expiry
 * notifications, cleans rate-limit data and reconciles payments whose callback never arrived.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { data: maintenance, error } = await createAdminClient().rpc('run_maintenance')
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  const status = getPaymentProvider()
  const payments = status.ready ? await reconcilePending({ repo: supabasePaymentRepo(), provider: status.provider }) : { skipped: 1 }

  return NextResponse.json({ maintenance, payments, ranAt: new Date().toISOString() })
}
