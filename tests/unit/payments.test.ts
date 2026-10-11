import { describe, expect, it, vi } from 'vitest'
import { EpointProvider, epointDecode, epointEncode, epointSign, epointVerify, normalizeEpointPayload } from '@/lib/payments/epoint'
import { applyProviderResult, reconcilePayment, startCheckout, type PaymentRecord, type PaymentRepo } from '@/lib/payments/service'
import type { ProviderResult } from '@/lib/payments/types'

const PRIVATE_KEY = 'test-private-key'

describe('Epoint signature', () => {
  it('matches the documented algorithm base64(sha1_raw(key + data + key))', () => {
    // Independently computed: printf '%s' 'test-private-keyeyJhIjoxfQ==test-private-key' | openssl sha1 -binary | base64
    expect(epointSign(PRIVATE_KEY, 'eyJhIjoxfQ==')).toBe('4x6VrJ0ZfpvZDzIDFpJJhGFQuBw=')
  })

  it('verifies authentic payloads and rejects tampering', () => {
    const data = epointEncode({ order_id: 'x', status: 'success', amount: 7 })
    const signature = epointSign(PRIVATE_KEY, data)
    expect(epointVerify(PRIVATE_KEY, data, signature)).toBe(true)
    const tampered = epointEncode({ order_id: 'x', status: 'success', amount: 0.01 })
    expect(epointVerify(PRIVATE_KEY, tampered, signature)).toBe(false)
    expect(epointVerify('other-key', data, signature)).toBe(false)
    expect(epointVerify(PRIVATE_KEY, data, '')).toBe(false)
  })

  it('decodes and normalizes callback payloads', () => {
    const payload = epointDecode(epointEncode({ order_id: 'abc', status: 'success', amount: '7.00', card_mask: '123456******1234', card_name: 'JOHN DOE' }))
    const r = normalizeEpointPayload(payload)
    expect(r.outcome).toBe('succeeded')
    expect(r.amount).toBe(7)
    expect(r.raw).not.toHaveProperty('card_name')
    expect(normalizeEpointPayload({ status: 'returned' }).outcome).toBe('refunded')
    expect(normalizeEpointPayload({ status: 'server_error' }).outcome).toBe('pending')
    expect(normalizeEpointPayload({ status: 'error' }).outcome).toBe('failed')
  })
})

describe('EpointProvider', () => {
  it('posts signed form data to /request and returns the redirect', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body))
      const data = body.get('data')!
      expect(epointVerify(PRIVATE_KEY, data, body.get('signature')!)).toBe(true)
      const payload = epointDecode(data)
      expect(payload).toMatchObject({ public_key: 'i000000001', amount: 7, currency: 'AZN', language: 'az', order_id: 'pay-1' })
      return new Response(JSON.stringify({ status: 'success', redirect_url: 'https://bank.example/pay/1', transaction: 'te_1' }))
    })
    const provider = new EpointProvider({ publicKey: 'i000000001', privateKey: PRIVATE_KEY, apiBase: 'https://epoint.az/api/1', fetchImpl: fetchImpl as typeof fetch })
    const result = await provider.createPayment({ paymentId: 'pay-1', amount: 7, currency: 'AZN', description: 'VIP', successUrl: 'https://p/ok', errorUrl: 'https://p/err', language: 'az' })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://epoint.az/api/1/request')
    expect(result).toEqual({ redirectUrl: 'https://bank.example/pay/1', transaction: 'te_1' })
  })

  it('throws on provider errors instead of pretending success', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: 'error', message: 'invalid key' })))
    const provider = new EpointProvider({ publicKey: 'x', privateKey: PRIVATE_KEY, apiBase: 'https://epoint.az/api/1', fetchImpl: fetchImpl as typeof fetch })
    await expect(provider.createPayment({ paymentId: 'p', amount: 1, currency: 'AZN', description: '', successUrl: '', errorUrl: '', language: 'az' })).rejects.toThrow('epoint_request_failed')
  })
})

function fakeRepo(payment: PaymentRecord) {
  const calls: string[] = []
  const repo: PaymentRepo = {
    createOrder: vi.fn(async () => ({ orderId: 'o1', paymentId: payment.id, amount: 7, currency: 'AZN', packageName: 'VIP' })),
    attachTransaction: vi.fn(async () => {}),
    getPayment: vi.fn(async (id) => (id === payment.id ? payment : null)),
    logEvent: vi.fn(async () => {}),
    confirm: vi.fn(async () => {
      calls.push('confirm')
      return 'activated'
    }),
    fail: vi.fn(async () => {
      calls.push('fail')
      return 'failed'
    }),
    refund: vi.fn(async () => {
      calls.push('refund')
      return 'refunded'
    }),
    touch: vi.fn(async () => {}),
    listPendingForReconciliation: vi.fn(async () => [payment]),
  }
  return { repo, calls }
}

const PAYMENT: PaymentRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  order_id: 'o1',
  user_id: 'u1',
  provider: 'epoint',
  provider_transaction: 'te_1',
  amount: 7,
  currency: 'AZN',
  status: 'pending',
}

const result = (over: Partial<ProviderResult>): ProviderResult => ({
  paymentId: PAYMENT.id,
  transaction: 'te_1',
  outcome: 'succeeded',
  providerStatus: 'success',
  amount: 7,
  currency: null,
  code: '000',
  message: null,
  cardMask: null,
  rrn: null,
  raw: {},
  ...over,
})

describe('payment service', () => {
  it('confirms successful callbacks via the idempotent repo call', async () => {
    const { repo, calls } = fakeRepo(PAYMENT)
    expect(await applyProviderResult(repo, result({}), 'callback')).toBe('activated')
    expect(calls).toEqual(['confirm'])
    expect(repo.logEvent).toHaveBeenCalledOnce()
  })

  it('fails failed callbacks and ignores unknown or mismatched payments', async () => {
    const { repo, calls } = fakeRepo(PAYMENT)
    expect(await applyProviderResult(repo, result({ outcome: 'failed', providerStatus: 'failed' }), 'callback')).toBe('failed')
    expect(await applyProviderResult(repo, result({ paymentId: 'not-a-uuid' }), 'callback')).toBe('unknown_payment')
    expect(await applyProviderResult(repo, result({ transaction: 'te_other' }), 'callback')).toBe('ignored')
    expect(calls).toEqual(['fail'])
  })

  it('only refunds payments that had succeeded', async () => {
    const { repo, calls } = fakeRepo(PAYMENT)
    expect(await applyProviderResult(repo, result({ outcome: 'refunded', providerStatus: 'returned' }), 'callback')).toBe('ignored')
    const done = fakeRepo({ ...PAYMENT, status: 'succeeded' })
    expect(await applyProviderResult(done.repo, result({ outcome: 'refunded', providerStatus: 'returned' }), 'callback')).toBe('refunded')
    expect(calls).toEqual([])
  })

  it('reconciles pending payments through get-status', async () => {
    const { repo, calls } = fakeRepo(PAYMENT)
    const provider = { name: 'epoint' as const, createPayment: vi.fn(), getStatus: vi.fn(async () => result({ paymentId: null })) }
    expect(await reconcilePayment({ repo, provider }, PAYMENT)).toBe('activated')
    expect(provider.getStatus).toHaveBeenCalledWith('te_1')
    expect(calls).toEqual(['confirm'])
  })

  it('marks the payment failed when initiation fails', async () => {
    const { repo, calls } = fakeRepo(PAYMENT)
    const provider = { name: 'epoint' as const, createPayment: vi.fn(async () => { throw new Error('epoint_http_error') }), getStatus: vi.fn() }
    await expect(
      startCheckout({ repo, provider }, { userId: 'u1', listingId: 'l1', packageId: 1, listingTitle: 'Fara' }, () => ({ successUrl: 's', errorUrl: 'e' })),
    ).rejects.toThrow('epoint_http_error')
    expect(calls).toEqual(['fail'])
  })
})
