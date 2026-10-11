import { notFound, redirect } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { requireUser } from '@/lib/auth'
import { serverEnv } from '@/lib/env.server'
import { createClient } from '@/lib/supabase/server'
import { supabasePaymentRepo } from '@/lib/payments'
import { applyProviderResult } from '@/lib/payments/service'
import { formatPrice } from '@/lib/format'

export const metadata = { title: 'Test ödənişi', robots: { index: false } }

function enabled() {
  return process.env.NODE_ENV !== 'production' && serverEnv().PAYMENT_PROVIDER === 'mock'
}

async function resolveTestPayment(formData: FormData) {
  'use server'
  if (!enabled()) notFound()
  const user = await requireUser()
  const paymentId = String(formData.get('payment_id'))
  const outcome = formData.get('outcome') === 'success' ? 'succeeded' : 'failed'
  const supabase = await createClient()
  // RLS: the user can only see their own payment.
  const { data: payment } = await supabase.from('payments').select('id, amount, provider, provider_transaction').eq('id', paymentId).eq('user_id', user.id).maybeSingle()
  if (!payment || payment.provider !== 'mock') notFound()
  await applyProviderResult(
    supabasePaymentRepo(),
    {
      paymentId,
      transaction: payment.provider_transaction as string,
      outcome,
      providerStatus: outcome === 'succeeded' ? 'success' : 'failed',
      amount: Number(payment.amount),
      currency: 'AZN',
      code: outcome === 'succeeded' ? '000' : '999',
      message: 'TEST',
      cardMask: null,
      rrn: null,
      raw: { test: true },
    },
    'callback',
  )
  redirect(`/odenis/netice?payment=${paymentId}`)
}

/** Development-only stand-in for the bank page. Returns 404 in production builds. */
export default async function TestPaymentPage({ params }: PageProps<'/odenis/test/[paymentId]'>) {
  if (!enabled()) notFound()
  const { paymentId } = await params
  const user = await requireUser()
  const supabase = await createClient()
  const { data: payment } = await supabase.from('payments').select('id, amount, status, provider').eq('id', paymentId).eq('user_id', user.id).maybeSingle()
  if (!payment || payment.provider !== 'mock') notFound()

  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-md space-y-5 p-8">
        <Alert tone="warning" title="TEST ÖDƏNİŞ SƏHİFƏSİ">Bu, bank səhifəsi deyil. Heç bir real ödəniş edilmir.</Alert>
        <p className="text-center font-display text-4xl font-extrabold">{formatPrice(payment.amount as number)}</p>
        <form action={resolveTestPayment} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="payment_id" value={paymentId} />
          <Button type="submit" name="outcome" value="success">Uğurlu (test)</Button>
          <Button type="submit" name="outcome" value="fail" variant="secondary">Uğursuz (test)</Button>
        </form>
      </div>
    </div>
  )
}
