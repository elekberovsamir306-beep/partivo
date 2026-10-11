import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { Gallery } from '@/components/listings/gallery'
import { ContactPanel } from '@/components/listings/contact-panel'
import { FavoriteButton } from '@/components/listings/favorite-button'
import { ReportButton, ShareButton } from '@/components/listings/listing-actions'
import { ListingGrid, PromoBadge } from '@/components/listings/listing-card'
import { TrackListingView } from '@/components/listings/recently-viewed'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { ClockIcon, EyeIcon, MapPinIcon, ShieldCheckIcon, StoreIcon, TruckIcon, UserIcon } from '@/components/icons'
import { getSessionUser, getViewer } from '@/lib/auth'
import { getListingByRef, getSellerOtherListings, getSimilarListings, isPubliclyVisible } from '@/lib/data/listings'
import { getMyFavoriteIds } from '@/lib/data/favorites'
import { absoluteUrl } from '@/lib/env'
import { formatDate, formatNumber, formatPrice, isFuture } from '@/lib/format'
import { avatarUrl, listingImageUrl } from '@/lib/storage'
import { listingPath, parseListingParam, truncate } from '@/lib/text'
import { t } from '@/i18n'

async function load(param: string) {
  const ref = parseListingParam(param)
  if (!ref) return null
  return getListingByRef(ref)
}

export async function generateMetadata({ params }: PageProps<'/elan/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const listing = await load(slug)
  if (!listing) return { title: 'Elan tapılmadı', robots: { index: false } }
  const cover = listingImageUrl(listing.images[0]?.storage_path)
  const description = truncate(
    [formatPrice(listing.price), listing.make?.name, listing.model?.name, listing.city?.name, listing.description.replace(/\s+/g, ' ')]
      .filter(Boolean)
      .join(' · '),
    160,
  )
  return {
    title: listing.title,
    description,
    alternates: { canonical: listingPath(listing) },
    robots: isPubliclyVisible(listing) ? undefined : { index: false, follow: false },
    openGraph: {
      type: 'website',
      title: `${listing.title} — ${formatPrice(listing.price)}`,
      description,
      url: listingPath(listing),
      images: cover ? [{ url: cover, width: listing.images[0].width, height: listing.images[0].height, alt: listing.title }] : undefined,
    },
  }
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex justify-between gap-4 border-b border-line py-3 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-fg">{value}</dd>
    </div>
  )
}

export default async function ListingPage({ params }: PageProps<'/elan/[slug]'>) {
  const { slug } = await params
  const listing = await load(slug)
  if (!listing) notFound()
  if (slug !== `${listing.ref_no}-${listing.slug}`) permanentRedirect(listingPath(listing))

  const [user, viewer, favoriteIds] = await Promise.all([getSessionUser(), getViewer(), getMyFavoriteIds()])
  const isOwner = user?.id === listing.owner_id
  const isPublic = isPubliclyVisible(listing)
  const isStaffView = !isOwner && !isPublic && (viewer?.permissions.includes('listings.view_all') ?? false)
  const [similar, sellerOther] = isPublic
    ? await Promise.all([getSimilarListings(listing), getSellerOtherListings(listing.owner_id, listing.id)])
    : [[], []]

  const url = absoluteUrl(listingPath(listing))
  const promo = {
    is_premium: isFuture(listing.promo_home_until),
    is_vip: isFuture(listing.promo_vip_until),
    is_top: isFuture(listing.promo_top_until),
  }
  const years =
    listing.year_from && listing.year_to && listing.year_from !== listing.year_to
      ? `${listing.year_from}–${listing.year_to}`
      : (listing.year_from ?? listing.year_to)
  const sellerName = listing.owner?.seller_type === 'business' ? (listing.owner.business_name ?? listing.owner.display_name) : listing.owner?.display_name
  const sellerAvatar = avatarUrl(listing.owner?.avatar_path)
  const images = listing.images.map((img) => ({
    id: img.id,
    src: listingImageUrl(img.storage_path) ?? '',
    thumb: listingImageUrl(img.thumb_path) ?? '',
    width: img.width,
    height: img.height,
  }))

  // Structured data only for live listings, built from the actual listing content.
  const jsonLd = isPublic
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: listing.title,
        description: truncate(listing.description, 500),
        sku: String(listing.ref_no),
        ...(listing.oem_code ? { mpn: listing.oem_code } : {}),
        ...(listing.manufacturer ? { brand: { '@type': 'Brand', name: listing.manufacturer } } : {}),
        ...(listing.category ? { category: listing.category.name } : {}),
        image: images.map((i) => i.src).slice(0, 5),
        ...(listing.price !== null
          ? {
              offers: {
                '@type': 'Offer',
                url,
                price: listing.price.toFixed(2),
                priceCurrency: 'AZN',
                availability: 'https://schema.org/InStock',
                itemCondition:
                  listing.condition === 'new'
                    ? 'https://schema.org/NewCondition'
                    : listing.condition === 'refurbished'
                      ? 'https://schema.org/RefurbishedCondition'
                      : 'https://schema.org/UsedCondition',
                ...(listing.expires_at ? { priceValidUntil: listing.expires_at.slice(0, 10) } : {}),
              },
            }
          : {}),
      }
    : null

  return (
    <div className="container-page py-6 sm:py-8">
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      ) : null}
      <TrackListingView listingId={listing.id} countView={isPublic && !isOwner} />

      <nav aria-label="Naviqasiya zənciri" className="mb-5 text-sm text-subtle">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-fg">Ana səhifə</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/elanlar" className="hover:text-fg">Elanlar</Link></li>
          {listing.category ? (
            <>
              <li aria-hidden="true">/</li>
              <li><Link href={`/kateqoriya/${listing.category.slug}`} className="hover:text-fg">{listing.category.name}</Link></li>
            </>
          ) : null}
        </ol>
      </nav>

      {!isPublic && (isOwner || isStaffView) ? (
        <div className="mb-6">
          <Alert
            tone={listing.status === 'rejected' || listing.status === 'removed' ? 'danger' : 'warning'}
            title={`Status: ${t.listingStatus[listing.status] ?? listing.status}. Bu elan hazırda ictimaiyyətə görünmür.`}
          >
            {listing.moderation_note ? <p>Moderator qeydi: {listing.moderation_note}</p> : null}
            {isOwner ? (
              <p className="mt-1">
                <Link href={`/hesab/elanlar/${listing.id}/redakte`} className="font-semibold text-accent-text underline-offset-4 hover:underline">
                  Elanı redaktə et
                </Link>
              </p>
            ) : null}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-8">
          <Gallery images={images} title={listing.title} />

          <section aria-labelledby="desc-heading" className="card p-5 sm:p-7">
            <h2 id="desc-heading" className="text-lg font-bold">Təsvir</h2>
            <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-muted">{listing.description}</p>
          </section>

          <section aria-labelledby="spec-heading" className="grid gap-6 md:grid-cols-2">
            <div className="card p-5 sm:p-7">
              <h2 id="spec-heading" className="mb-2 text-lg font-bold">Hissə haqqında</h2>
              <dl>
                <Spec label="Vəziyyət" value={listing.condition ? t.conditions[listing.condition] : null} />
                <Spec label="Kateqoriya" value={listing.category?.name} />
                <Spec label="OEM / hissə nömrəsi" value={listing.oem_code ? <span className="font-mono">{listing.oem_code}</span> : null} />
                <Spec label="İstehsalçı / brend" value={listing.manufacturer} />
                <Spec label="Original / analoq" value={listing.originality ? t.originality[listing.originality] : null} />
                <Spec
                  label="Zəmanət"
                  value={
                    listing.warranty_months
                      ? `${listing.warranty_months} ay${listing.warranty_notes ? ` — ${listing.warranty_notes}` : ''}`
                      : listing.warranty_notes
                  }
                />
              </dl>
            </div>
            <div className="card p-5 sm:p-7">
              <h2 className="mb-2 text-lg font-bold">Uyğunluq</h2>
              <dl>
                <Spec label="Marka" value={listing.make?.name} />
                <Spec label="Model" value={listing.model?.name} />
                <Spec label="İllər" value={years} />
                <Spec label="Mühərrik" value={[listing.engine_type ? t.engineTypes[listing.engine_type] : null, listing.engine_volume ? `${listing.engine_volume} l` : null].filter(Boolean).join(', ')} />
              </dl>
              {listing.compatibility_notes ? (
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted">{listing.compatibility_notes}</p>
              ) : null}
              {!listing.make && !listing.compatibility_notes ? (
                <p className="mt-3 text-sm text-subtle">Satıcı uyğunluq məlumatı göstərməyib. Almadan əvvəl OEM kodunu soruşun.</p>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="delivery-heading" className="card p-5 sm:p-7">
            <h2 id="delivery-heading" className="text-lg font-bold">Təhvil</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {listing.pickup_available ? <Badge><MapPinIcon size={13} />Yerindən götürmə</Badge> : null}
              {listing.delivery_available ? <Badge tone="success"><TruckIcon size={13} />Çatdırılma var</Badge> : null}
            </ul>
            {listing.delivery_notes ? <p className="mt-3 text-sm text-muted">{listing.delivery_notes}</p> : null}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <PromoBadge card={promo} />
              {listing.condition ? <Badge>{t.conditions[listing.condition]}</Badge> : null}
            </div>
            <h1 className="mt-3 text-xl leading-snug font-extrabold sm:text-2xl">{listing.title}</h1>
            <p className="mt-3 font-display text-3xl font-extrabold tracking-tight tabular-nums">{formatPrice(listing.price)}</p>
            {listing.is_negotiable ? <p className="mt-1 text-sm text-muted">{t.common.negotiable}</p> : null}
            <ul className="mt-4 space-y-1.5 text-sm text-muted">
              {listing.city ? (
                <li className="flex items-center gap-2"><MapPinIcon size={15} />{listing.city.name}</li>
              ) : null}
              {listing.published_at ? (
                <li className="flex items-center gap-2"><ClockIcon size={15} />{t.common.published}: {formatDate(listing.published_at)}</li>
              ) : null}
              <li className="flex items-center gap-2"><EyeIcon size={15} />{formatNumber(listing.view_count)} {t.common.views}</li>
              <li className="text-xs text-subtle">{t.common.ref} {listing.ref_no}</li>
            </ul>

            <div className="mt-5">
              {isPublic || isOwner ? (
                <ContactPanel listingId={listing.id} listingTitle={listing.title} listingUrl={url} contactMethod={listing.contact_method} />
              ) : (
                <Alert tone="warning">Elan aktiv olmadığı üçün əlaqə məlumatı göstərilmir.</Alert>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {isPublic ? <FavoriteButton listingId={listing.id} initial={favoriteIds.has(listing.id)} variant="full" /> : null}
              <ShareButton url={url} title={listing.title} />
            </div>
            {isOwner ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <ButtonLink href={`/hesab/elanlar/${listing.id}/redakte`} variant="secondary" size="sm">Redaktə et</ButtonLink>
                {isPublic ? <ButtonLink href={`/hesab/elanlar/${listing.id}/irelilet`} size="sm">İrəli çək</ButtonLink> : null}
              </div>
            ) : null}
          </div>

          {listing.owner ? (
            <div className="card p-5 sm:p-6">
              <Link href={`/satici/${listing.owner.id}`} className="group flex items-center gap-3">
                {sellerAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- pre-optimised 320px avatar
                  <img src={sellerAvatar} alt="" width={52} height={52} className="size-13 rounded-xl object-cover" />
                ) : (
                  <span className="grid size-13 place-items-center rounded-xl bg-surface-2 text-silver">
                    {listing.owner.seller_type === 'business' ? <StoreIcon size={22} /> : <UserIcon size={22} />}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-bold group-hover:text-accent-text">
                    <span className="truncate">{sellerName}</span>
                    {listing.owner.is_verified ? <ShieldCheckIcon size={16} className="shrink-0 text-success" aria-label="Təsdiqlənmiş satıcı" /> : null}
                  </span>
                  <span className="block text-xs text-subtle">
                    {t.sellerTypes[listing.owner.seller_type]} · {formatDate(listing.owner.created_at)} tarixindən
                  </span>
                </span>
              </Link>
              {listing.owner.is_verified ? (
                <p className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">Təsdiqlənmiş satıcı: biznes məlumatları Partivo tərəfindən yoxlanılıb.</p>
              ) : null}
            </div>
          ) : null}

          {!isOwner && isPublic ? (
            <div className="px-1">
              <ReportButton listingId={listing.id} signedIn={Boolean(user)} loginHref={`/giris?next=${encodeURIComponent(listingPath(listing))}`} />
            </div>
          ) : null}
        </aside>
      </div>

      {sellerOther.length ? (
        <section aria-labelledby="seller-other" className="mt-16">
          <div className="mb-5 flex items-end justify-between">
            <h2 id="seller-other" className="text-2xl font-extrabold">Satıcının digər elanları</h2>
            <Link href={`/satici/${listing.owner_id}`} className="text-sm font-semibold text-accent-text">Hamısı</Link>
          </div>
          <ListingGrid cards={sellerOther} favoriteIds={favoriteIds} />
        </section>
      ) : null}

      {similar.length ? (
        <section aria-labelledby="similar" className="mt-16">
          <h2 id="similar" className="mb-5 text-2xl font-extrabold">Oxşar elanlar</h2>
          <ListingGrid cards={similar} favoriteIds={favoriteIds} />
        </section>
      ) : null}
    </div>
  )
}
