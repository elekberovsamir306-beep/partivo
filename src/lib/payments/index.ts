import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { publicEnv } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'
import { EpointProvider } from './epoint'
import { MockProvider } from './mock'
import type { PaymentRepo, PaymentRecord } from './service'
import type { PaymentProvider } from './types'

export type ProviderStatus =
  | { ready: true; provider: PaymentProvider }
  | { ready: false; reason: 'not_configured' | 'missing_credentials' }

/** Selects the configured provider. Returns ready:false (never a fake success) when credentials are missing. */
export function getPaymentProvider(): ProviderStatus {
  const env = serverEnv()
  if (env.PAYMENT_PROVIDER === 'epoint') {
    if (!env.EPOINT_PUBLIC_KEY || !env.EPOINT_PRIVATE_KEY) return { ready: false, reason: 'missing_credentials' }
    return {
      ready: true,
      provider: new EpointProvider({
        publicKey: env.EPOINT_PUBLIC_KEY,
        privateKey: env.EPOINT_PRIVATE_KEY,
        apiBase: env.EPOINT_API_BASE,
      }),
    }
  }
  if (env.PAYMENT_PROVIDER === 'mock' && process.env.NODE_ENV !== 'production') {
    return { ready: true, provider: new MockProvider(publicEnv.siteUrl) }
  }
  return { ready: false, reason: 'not_configured' }
}

function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

export function supabasePaymentRepo(): PaymentRepo {
  const db = createAdminClient()
  return {
    async createOrder({ userId, listingId, packageId, provider }) {
      const rows = unwrap(
        await db.rpc('create_promotion_order', {
          p_user_id: userId,
          p_listing_id: listingId,
          p_package_id: packageId,
          p_provider: provider,
        }),
      ) as { order_id: string; payment_id: string; amount: number; currency: string; package_name: string }[]
      const row = rows[0]
      return {
        orderId: row.order_id,
        paymentId: row.payment_id,
        amount: Number(row.amount),
        currency: row.currency,
        packageName: row.package_name,
      }
    },
    async attachTransaction(paymentId, transaction) {
      unwrap(await db.rpc('attach_provider_transaction', { p_payment_id: paymentId, p_transaction: transaction }))
    },
    async getPayment(paymentId) {
      const row = unwrap(
        await db
          .from('payments')
          .select('id, order_id, user_id, provider, provider_transaction, amount, currency, status')
          .eq('id', paymentId)
          .maybeSingle(),
      ) as PaymentRecord | null
      return row ? { ...row, amount: Number(row.amount) } : null
    },
    async logEvent(e) {
      unwrap(
        await db.from('payment_events').insert({
          payment_id: e.paymentId,
          source: e.source,
          signature_valid: e.signatureValid,
          provider_status: e.providerStatus,
          payload: e.payload,
        }),
      )
    },
    async confirm(paymentId, r) {
      return unwrap(
        await db.rpc('confirm_payment', {
          p_payment_id: paymentId,
          p_provider_transaction: r.transaction,
          p_amount: r.amount,
          p_currency: r.currency,
          p_provider_status: r.providerStatus,
          p_code: r.code,
          p_message: r.message,
          p_card_mask: r.cardMask,
          p_rrn: r.rrn,
        }),
      ) as string
    },
    async fail(paymentId, r) {
      return unwrap(
        await db.rpc('fail_payment', {
          p_payment_id: paymentId,
          p_provider_status: r.providerStatus,
          p_code: r.code,
          p_message: r.message,
        }),
      ) as string
    },
    async refund(paymentId, note) {
      return unwrap(await db.rpc('refund_payment', { p_payment_id: paymentId, p_note: note })) as string
    },
    async touch(paymentId) {
      unwrap(await db.from('payments').update({ last_checked_at: new Date().toISOString() }).eq('id', paymentId))
    },
    async listPendingForReconciliation(limit) {
      const since = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      const before = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      const rows = unwrap(
        await db
          .from('payments')
          .select('id, order_id, user_id, provider, provider_transaction, amount, currency, status')
          .eq('status', 'pending')
          .gte('created_at', since)
          .lte('created_at', before)
          .order('last_checked_at', { ascending: true, nullsFirst: true })
          .limit(limit),
      ) as PaymentRecord[]
      return rows.map((r) => ({ ...r, amount: Number(r.amount) }))
    },
  }
}
