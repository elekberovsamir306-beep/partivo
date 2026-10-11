export type PaymentOutcome = 'succeeded' | 'failed' | 'pending' | 'refunded'

/** Provider-agnostic view of a payment result (from a callback or a status query). */
export interface ProviderResult {
  /** Our payments.id, which we send to the provider as order_id. */
  paymentId: string | null
  transaction: string | null
  outcome: PaymentOutcome
  providerStatus: string
  amount: number | null
  currency: string | null
  code: string | null
  message: string | null
  cardMask: string | null
  rrn: string | null
  raw: Record<string, unknown>
}

export interface CreatePaymentInput {
  paymentId: string
  amount: number
  currency: 'AZN'
  description: string
  successUrl: string
  errorUrl: string
  language: 'az' | 'en' | 'ru'
}

export interface CreatePaymentResult {
  redirectUrl: string
  transaction: string | null
}

export interface PaymentProvider {
  readonly name: 'epoint' | 'mock'
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>
  getStatus(transaction: string): Promise<ProviderResult>
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'PaymentProviderError'
  }
}
