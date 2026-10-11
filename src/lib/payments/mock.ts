/**
 * Local-development test provider. It never moves money and refuses to run in production builds.
 * Payments created with it are stored with provider = 'mock' and are excluded from revenue reports.
 */
import { PaymentProviderError, type CreatePaymentInput, type PaymentProvider, type ProviderResult } from './types'

export class MockProvider implements PaymentProvider {
  readonly name = 'mock' as const

  constructor(private readonly siteUrl: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new PaymentProviderError('mock_provider_forbidden_in_production')
    }
  }

  async createPayment(input: CreatePaymentInput) {
    return {
      redirectUrl: `${this.siteUrl}/odenis/test/${input.paymentId}`,
      transaction: `mock_${input.paymentId}`,
    }
  }

  async getStatus(transaction: string): Promise<ProviderResult> {
    // The mock has no remote state; payments stay pending until the developer resolves them on the test page.
    return {
      paymentId: transaction.replace(/^mock_/, ''),
      transaction,
      outcome: 'pending',
      providerStatus: 'new',
      amount: null,
      currency: null,
      code: null,
      message: null,
      cardMask: null,
      rrn: null,
      raw: { transaction },
    }
  }
}
