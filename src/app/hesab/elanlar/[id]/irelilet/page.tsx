import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { requireUser } from '@/lib/auth'
import { getListingById, isPubliclyVisible } from '@/lib/data/listings'
import { getActivePackages } from '@/lib/data/packages'
import { getPaymentProvider } from '@/lib/payments'
import { listingPath } from '@/lib/text'
import { CheckoutForm } from './checkout-form'

export const metadata: Metadata = { title: 'Elanı irəli çək', robots: { index: false } }

export default async function PromotePage({ params }: PageProps<'/hesab/elanlar/[id]/irelilet'>) {
  const { id } = await params
  const user = await requireUser(`/hesab/elanlar/${id}/irelilet`)
  const [listing, packages] = await Promise.all([getListingById(id), getActivePackages()])
  if (!listing || listing.owner_id !== user.id) notFound()
  const provider = getPaymentProvider()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Elanı irəli çək</h1>
        <p className="mt-1.5 text-sm text-muted">
          <Link href={listingPath(listing)} className="font-semibold text-fg hover:underline">{listing.title}</Link> · № {listing.ref_no}
        </p>
      </div>
      {!isPubliclyVisible(listing) ? (
        <Alert tone="warning" title="Elan aktiv deyil">Reklam yalnız dərc olunmuş, aktiv elanlar üçün sifariş edilə bilər.</Alert>
      ) : !provider.ready ? (
        <Alert tone="warning" title="Onlayn ödəniş hələ qoşulmayıb">
          Ödəniş sistemi aktivləşdirildikdən sonra bu səhifədən reklam ala biləcəksiniz.
        </Alert>
      ) : (
        <CheckoutForm
          listingId={listing.id}
          packages={packages}
          testMode={provider.provider.name === 'mock'}
        />
      )}
    </div>
  )
}
