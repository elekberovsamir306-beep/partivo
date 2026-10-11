/**
 * Epoint (epoint.az) payment adapter.
 *
 * Based on the official documentation at https://developer.epoint.az (checked 2026-10-10):
 *  - POST {base}/request     create a payment, returns { status, redirect_url, transaction, trace_id }
 *  - POST {base}/get-status  query a payment by transaction id
 *  - Every request is form-encoded with two fields:
 *      data      = base64(JSON payload, which includes public_key)
 *      signature = base64(sha1_raw(private_key + data + private_key))
 *  - Callbacks are POSTed to the merchant's result_url (configured in the Epoint merchant cabinet)
 *    with the same data/signature pair. Statuses: new, success, returned, failed, error, server_error.
 *
 * The docs do not specify callback retries, so every pending payment is also reconciled via get-status.
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import {
  PaymentProviderError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentOutcome,
  type PaymentProvider,
  type ProviderResult,
} from './types'

export function epointSign(privateKey: string, data: string): string {
  return createHash('sha1').update(privateKey + data + privateKey, 'utf8').digest('base64')
}

export function epointEncode(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
}

export function epointVerify(privateKey: string, data: string, signature: string): boolean {
  if (!data || !signature) return false
  const expected = Buffer.from(epointSign(privateKey, data))
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export function epointDecode(data: string): Record<string, unknown> {
  const json = Buffer.from(data, 'base64').toString('utf8')
  const parsed: unknown = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PaymentProviderError('epoint_invalid_payload')
  }
  return parsed as Record<string, unknown>
}

const STATUS_MAP: Record<string, PaymentOutcome> = {
  success: 'succeeded',
  failed: 'failed',
  error: 'failed',
  returned: 'refunded',
  new: 'pending',
  server_error: 'pending', // verification error on Epoint's side: re-check later rather than fail
}

const str = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v))

export function normalizeEpointPayload(payload: Record<string, unknown>): ProviderResult {
  const providerStatus = String(payload.status ?? 'unknown')
  const amount = payload.amount === undefined || payload.amount === null ? null : Number(payload.amount)
  return {
    paymentId: str(payload.order_id),
    transaction: str(payload.transaction),
    outcome: STATUS_MAP[providerStatus] ?? 'pending',
    providerStatus,
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    currency: str(payload.currency),
    code: str(payload.code),
    message: str(payload.message),
    cardMask: str(payload.card_mask),
    rrn: str(payload.rrn),
    raw: redact(payload),
  }
}

/** Keep only fields useful for reconciliation; never persist cardholder names. */
function redact(payload: Record<string, unknown>) {
  const { card_name: _cardName, ...rest } = payload
  void _cardName
  return rest
}

export interface EpointConfig {
  publicKey: string
  privateKey: string
  apiBase: string
  fetchImpl?: typeof fetch
}

export class EpointProvider implements PaymentProvider {
  readonly name = 'epoint' as const
  private readonly fetchImpl: typeof fetch

  constructor(private readonly config: EpointConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch
  }

  private async call(path: string, payload: Record<string, unknown>) {
    const data = epointEncode({ public_key: this.config.publicKey, ...payload })
    const signature = epointSign(this.config.privateKey, data)
    const response = await this.fetchImpl(`${this.config.apiBase.replace(/\/+$/, '')}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ data, signature }).toString(),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
    const text = await response.text()
    let json: Record<string, unknown>
    try {
      json = JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new PaymentProviderError('epoint_invalid_response', { httpStatus: response.status, body: text.slice(0, 300) })
    }
    if (!response.ok) {
      throw new PaymentProviderError('epoint_http_error', { httpStatus: response.status, body: json })
    }
    return json
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const json = await this.call('request', {
      amount: Number(input.amount.toFixed(2)),
      currency: input.currency,
      language: input.language,
      order_id: input.paymentId,
      description: input.description.slice(0, 1000),
      success_redirect_url: input.successUrl,
      error_redirect_url: input.errorUrl,
    })
    if (json.status !== 'success' || typeof json.redirect_url !== 'string') {
      throw new PaymentProviderError('epoint_request_failed', {
        message: json.message,
        trace_id: json.trace_id,
      })
    }
    const redirect = new URL(json.redirect_url)
    if (redirect.protocol !== 'https:') {
      throw new PaymentProviderError('epoint_insecure_redirect')
    }
    return { redirectUrl: redirect.toString(), transaction: str(json.transaction) }
  }

  async getStatus(transaction: string): Promise<ProviderResult> {
    const json = await this.call('get-status', { transaction })
    return normalizeEpointPayload(json)
  }
}
