import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env.server'
import { epointDecode, epointVerify, normalizeEpointPayload } from '@/lib/payments/epoint'
import { applyProviderResult } from '@/lib/payments/service'
import { supabasePaymentRepo } from '@/lib/payments'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Epoint result_url. Configure https://partivo.az/api/payments/epoint/callback in the Epoint merchant cabinet.
 * The signature is verified before anything is decoded or trusted; processing is idempotent.
 */
export async function POST(request: Request) {
  const env = serverEnv()
  if (!env.EPOINT_PRIVATE_KEY) return NextResponse.json({ status: 'error', message: 'not_configured' }, { status: 503 })

  let data = ''
  let signature = ''
  try {
    const form = await request.formData()
    data = String(form.get('data') ?? '')
    signature = String(form.get('signature') ?? '')
  } catch {
    return NextResponse.json({ status: 'error', message: 'bad_request' }, { status: 400 })
  }

  if (!epointVerify(env.EPOINT_PRIVATE_KEY, data, signature)) {
    // Log the rejected attempt without its (unverified) payload contents.
    await createAdminClient()
      .from('payment_events')
      .insert({ payment_id: null, source: 'callback', signature_valid: false, provider_status: 'invalid_signature', payload: { length: data.length } })
    return NextResponse.json({ status: 'error', message: 'invalid_signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = epointDecode(data)
  } catch {
    return NextResponse.json({ status: 'error', message: 'invalid_payload' }, { status: 400 })
  }

  try {
    const outcome = await applyProviderResult(supabasePaymentRepo(), normalizeEpointPayload(payload), 'callback')
    return NextResponse.json({ status: 'success', outcome })
  } catch (error) {
    console.error('[epoint-callback] processing failed', (error as Error).message)
    // A 5xx lets the provider retry; the pending payment is also reconciled by the cron job.
    return NextResponse.json({ status: 'error', message: 'processing_failed' }, { status: 500 })
  }
}
