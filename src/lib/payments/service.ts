/**
 * Payment orchestration. Dependencies are injected so the flow can be unit-tested without network or database.
 * Money-related state transitions happen in idempotent database functions (confirm_payment, fail_payment,
 * refund_payment); this module only decides which one to call and records every event.
 */
import type { PaymentProvider, ProviderResult } from './types'

export interface PaymentRecord {
  id: string
  order_id: string
  user_id: string | null
  provider: 'epoint' | 'mock'
  provider_transaction: string | null
  amount: number
  currency: string
  status: 'created' | 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled'
}

export interface PaymentRepo {
  createOrder(input: { userId: string; listingId: string; packageId: number; provider: 'epoint' | 'mock' }): Promise<{
    orderId: string
    paymentId: string
    amount: number
    currency: string
    packageName: string
  }>
  attachTransaction(paymentId: string, transaction: string): Promise<void>
  getPayment(paymentId: string): Promise<PaymentRecord | null>
  logEvent(event: {
    paymentId: string | null
    source: 'callback' | 'status_check' | 'initiation' | 'admin'
    signatureValid: boolean | null
    providerStatus: string | null
    payload: Record<string, unknown>
  }): Promise<void>
  confirm(paymentId: string, r: ProviderResult): Promise<string>
  fail(paymentId: string, r: ProviderResult): Promise<string>
  refund(paymentId: string, note: string): Promise<string>
  touch(paymentId: string): Promise<void>
  listPendingForReconciliation(limit: number): Promise<PaymentRecord[]>
}

export interface CheckoutUrls {
  successUrl: string
  errorUrl: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function startCheckout(
  deps: { repo: PaymentRepo; provider: PaymentProvider },
  input: { userId: string; listingId: string; packageId: number; listingTitle: string },
  urls: (paymentId: string) => CheckoutUrls,
): Promise<{ redirectUrl: string; paymentId: string }> {
  const order = await deps.repo.createOrder({
    userId: input.userId,
    listingId: input.listingId,
    packageId: input.packageId,
    provider: deps.provider.name,
  })

  try {
    const { successUrl, errorUrl } = urls(order.paymentId)
    const result = await deps.provider.createPayment({
      paymentId: order.paymentId,
      amount: order.amount,
      currency: 'AZN',
      description: `Partivo ${order.packageName}: ${input.listingTitle}`,
      successUrl,
      errorUrl,
      language: 'az',
    })
    if (result.transaction) await deps.repo.attachTransaction(order.paymentId, result.transaction)
    await deps.repo.logEvent({
      paymentId: order.paymentId,
      source: 'initiation',
      signatureValid: null,
      providerStatus: 'redirect_issued',
      payload: { transaction: result.transaction },
    })
    return { redirectUrl: result.redirectUrl, paymentId: order.paymentId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'provider_error'
    await deps.repo.logEvent({
      paymentId: order.paymentId,
      source: 'initiation',
      signatureValid: null,
      providerStatus: 'initiation_failed',
      payload: { error: message, details: (error as { details?: unknown }).details ?? null },
    })
    await deps.repo.fail(order.paymentId, {
      paymentId: order.paymentId,
      transaction: null,
      outcome: 'failed',
      providerStatus: 'initiation_failed',
      amount: null,
      currency: null,
      code: null,
      message,
      cardMask: null,
      rrn: null,
      raw: {},
    })
    throw error
  }
}

export type ApplyResult =
  | 'activated'
  | 'already_processed'
  | 'amount_mismatch'
  | 'requires_refund'
  | 'failed'
  | 'refunded'
  | 'pending'
  | 'ignored'
  | 'unknown_payment'

/** Applies a verified provider result. Safe to call any number of times for the same payment. */
export async function applyProviderResult(
  repo: PaymentRepo,
  result: ProviderResult,
  source: 'callback' | 'status_check',
  knownPaymentId?: string,
): Promise<ApplyResult> {
  const paymentId = knownPaymentId ?? result.paymentId
  if (!paymentId || !UUID.test(paymentId)) {
    await repo.logEvent({ paymentId: null, source, signatureValid: true, providerStatus: result.providerStatus, payload: result.raw })
    return 'unknown_payment'
  }
  const payment = await repo.getPayment(paymentId)
  await repo.logEvent({
    paymentId: payment ? paymentId : null,
    source,
    signatureValid: true,
    providerStatus: result.providerStatus,
    payload: result.raw,
  })
  if (!payment) return 'unknown_payment'
  if (payment.provider_transaction && result.transaction && payment.provider_transaction !== result.transaction) {
    return 'ignored'
  }

  switch (result.outcome) {
    case 'succeeded':
      return (await repo.confirm(paymentId, result)) as ApplyResult
    case 'failed':
      return (await repo.fail(paymentId, result)) as ApplyResult
    case 'refunded':
      if (payment.status !== 'succeeded' && payment.status !== 'refunded') return 'ignored'
      return (await repo.refund(paymentId, `provider:${result.providerStatus}`)) as ApplyResult
    default:
      await repo.touch(paymentId)
      return 'pending'
  }
}

/** Queries the provider for a payment whose outcome we have not received yet. */
export async function reconcilePayment(
  deps: { repo: PaymentRepo; provider: PaymentProvider },
  payment: PaymentRecord,
): Promise<ApplyResult> {
  if (!payment.provider_transaction || payment.provider !== deps.provider.name) return 'ignored'
  if (payment.status !== 'pending' && payment.status !== 'created') return 'already_processed'
  const result = await deps.provider.getStatus(payment.provider_transaction)
  return applyProviderResult(deps.repo, result, 'status_check', payment.id)
}

export async function reconcilePending(deps: { repo: PaymentRepo; provider: PaymentProvider }, limit = 25) {
  const pending = await deps.repo.listPendingForReconciliation(limit)
  const summary: Record<string, number> = {}
  for (const payment of pending) {
    try {
      const outcome = await reconcilePayment(deps, payment)
      summary[outcome] = (summary[outcome] ?? 0) + 1
    } catch {
      summary.error = (summary.error ?? 0) + 1
    }
  }
  return summary
}
