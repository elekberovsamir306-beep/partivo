import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ListingWizard } from '@/components/listings/listing-wizard'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/ui/badge'
import { requireUser } from '@/lib/auth'
import { getEditableListing, getWizardOptions, getWizardSettings } from '@/lib/data/wizard'
import { listingPath } from '@/lib/text'
import { t } from '@/i18n'

export const metadata: Metadata = { title: 'Elanı redaktə et', robots: { index: false } }

export default async function EditListingPage({ params }: PageProps<'/hesab/elanlar/[id]/redakte'>) {
  const { id } = await params
  const user = await requireUser(`/hesab/elanlar/${id}/redakte`)
  const [editable, options, settings] = await Promise.all([getEditableListing(id, user.id), getWizardOptions(), getWizardSettings()])
  if (!editable) notFound()
  const { listing, values, images } = editable

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{listing.title || 'Yeni elan'}</h1>
        <StatusBadge status={listing.status} label={t.listingStatus[listing.status] ?? listing.status} />
        {listing.status !== 'draft' ? (
          <Link href={listingPath(listing)} className="ml-auto text-sm font-semibold text-accent-text hover:underline">
            Elana bax
          </Link>
        ) : null}
      </div>
      {listing.status === 'rejected' && listing.moderation_note ? (
        <div className="mb-6">
          <Alert tone="danger" title="Elan rədd edilib">
            Səbəb: {listing.moderation_note}. Düzəlişləri edib yenidən dərc edə bilərsiniz.
          </Alert>
        </div>
      ) : null}
      {listing.status === 'removed' ? (
        <Alert tone="danger" title="Elan moderator tərəfindən silinib">
          {listing.moderation_note ?? 'Bu elan redaktə edilə bilməz.'}
        </Alert>
      ) : (
        <ListingWizard listingId={listing.id} status={listing.status} initial={values} images={images} options={options} settings={settings} />
      )}
    </div>
  )
}
