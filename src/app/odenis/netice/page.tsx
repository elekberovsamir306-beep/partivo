import type { Metadata } from 'next'
import { Alert } from '@/components/ui/alert'
import { ButtonLink } from '@/components/ui/button'
import { CheckIcon, ClockIcon, XIcon } from '@/components/icons'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getPaymentProvider, supabasePaymentRepo } from '@/lib/payments'
import { reconcilePayment, type PaymentRecord } from '@/lib/payments/service'
import { formatDateTime, formatPrice } from '@/lib/format'

export const metadata: Metadata = { title: 'Ödənişin nəticəsi', robots: { index: false } }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The browser redirect from the bank is NOT proof of payment. This page only displays the status stored
 * in the database (set by the signed callback) and, if still pending, asks the provider directly.
 */
export default async function PaymentResultPage({ searchParams }: PageProps<'/odenis/netice'>) {
  const params = await searchParams
  const paymentId = typeof params.payment === 'string' && UUID.test(params.payment) ? params.payment : null
  await requireUser(`/odenis/netice${paymentId ? `?payment=${paymentId}` : ''}`)
  if (!paymentId) return <Result tone="danger" title="Ödəniş tapılmadı" />

  const supabase = await createClient()
  const load = async () =>
    (
      await supabase
        .from('payments')
        .select('id, order_id, user_id, provider, provider_transaction, amount, currency, status, confirmed_at, order:promotion_orders(status, ends_at, package_snapshot)')
        .eq('id', paymentId)
        .maybeSingle()
    ).data as (PaymentRecord & { confirmed_at: string | null; order: { status: string; ends_at: string | null; package_snapshot: { name: string } } | null }) | null

  let payment = await load()
  if (!payment) return <Result tone="danger" title="Ödəniş tapılmadı" />

  if (payment.status === 'pending') {
    const status = getPaymentProvider()
    if (status.ready) {
      try {
        await reconcilePayment({ repo: supabasePaymentRepo(), provider: status.provider }, { ...payment, amount: Number(payment.amount) })
        payment = (await load()) ?? payment
      } catch (error) {
        console.error('[payment-result] reconcile failed', (error as Error).message)
      }
    }
  }

  const testNote = payment.provider === 'mock' ? <Alert tone="warning">TEST ödənişi — real pul köçürülməyib.</Alert> : null

  if (payment.status === 'succeeded') {
    return (
      <Result tone="success" title="Ödəniş uğurla tamamlandı">
        {testNote}
        <p className="text-sm text-muted">
          {payment.order?.package_snapshot.name} · {formatPrice(payment.amount)}
          {payment.order?.ends_at ? ` · ${formatDateTime(payment.order.ends_at)} tarixinədək aktivdir` : ''}
        </p>
        {payment.order?.status === 'cancelled' ? (
          <Alert tone="warning">Ödəniş qəbul edildi, lakin elan artıq aktiv deyil. Dəstək komandası geri ödəniş üçün sizinlə əlaqə saxlayacaq.</Alert>
        ) : null}
      </Result>
    )
  }
  if (payment.status === 'failed' || payment.status === 'cancelled') {
    return (
      <Result tone="danger" title="Ödəniş baş tutmadı">
        {testNote}
        <p className="text-sm text-muted">Hesabınızdan vəsait silinməyib. Yenidən cəhd edə bilərsiniz.</p>
      </Result>
    )
  }
  if (payment.status === 'refunded') return <Result tone="info" title="Ödəniş geri qaytarılıb" />
  return (
    <Result tone="info" title="Ödəniş yoxlanılır">
      {testNote}
      <p className="text-sm text-muted">
        {params.cancelled ? 'Ödəniş səhifəsindən çıxdınız. ' : ''}Bank təsdiqi bir neçə dəqiqə çəkə bilər. Status avtomatik yenilənəcək; bu səhifəni bir az sonra yeniləyin.
      </p>
    </Result>
  )
}

function Result({ tone, title, children }: { tone: 'success' | 'danger' | 'info'; title: string; children?: React.ReactNode }) {
  const Icon = tone === 'success' ? CheckIcon : tone === 'danger' ? XIcon : ClockIcon
  const color = tone === 'success' ? 'bg-success-soft text-success' : tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-muted'
  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-lg space-y-4 p-8 text-center">
        <span className={`mx-auto grid size-16 place-items-center rounded-full ${color}`}>
          <Icon size={30} />
        </span>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {children}
        <div className="flex justify-center gap-3 pt-2">
          <ButtonLink href="/hesab/odenisler" variant="secondary">Ödənişlərim</ButtonLink>
          <ButtonLink href="/hesab/elanlar">Elanlarım</ButtonLink>
        </div>
      </div>
    </div>
  )
}
