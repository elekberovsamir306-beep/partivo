import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListingGrid } from '@/components/listings/listing-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { MapPinIcon, PackageIcon, ShieldCheckIcon, StoreIcon, UserIcon } from '@/components/icons'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'
import { getCities } from '@/lib/data/catalog'
import { searchListings } from '@/lib/data/listings'
import { getMyFavoriteIds } from '@/lib/data/favorites'
import { parseSearchParams } from '@/lib/search-params'
import { avatarUrl } from '@/lib/storage'
import { formatDate, formatNumber } from '@/lib/format'
import { t } from '@/i18n'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface PublicSeller {
  id: string
  display_name: string
  seller_type: 'private' | 'business'
  business_name: string | null
  business_description: string | null
  business_address: string | null
  avatar_path: string | null
  city_slug: string | null
  is_verified: boolean
  created_at: string
}

async function getSeller(id: string): Promise<PublicSeller | null> {
  if (!UUID.test(id) || !isSupabaseConfigured()) return null
  const supabase = await createClient()
  // Public profile columns only; suspended sellers are excluded.
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, seller_type, business_name, business_description, business_address, avatar_path, city_slug, is_verified, created_at')
    .eq('id', id)
    .eq('is_suspended', false)
    .maybeSingle()
  return data as PublicSeller | null
}

export async function generateMetadata({ params }: PageProps<'/satici/[id]'>): Promise<Metadata> {
  const { id } = await params
  const seller = await getSeller(id)
  if (!seller) return { title: 'Satıcı tapılmadı', robots: { index: false } }
  const name = seller.business_name ?? seller.display_name
  return {
    title: `${name} — satıcı profili`,
    description: seller.business_description?.slice(0, 160) ?? `${name} satıcısının Partivo-dakı ehtiyat hissələri elanları.`,
    alternates: { canonical: `/satici/${seller.id}` },
  }
}

export default async function SellerPage({ params, searchParams }: PageProps<'/satici/[id]'>) {
  const { id } = await params
  const seller = await getSeller(id)
  if (!seller) notFound()
  const filters = { ...parseSearchParams(await searchParams), sort: 'newest' as const }
  const [result, cities, favoriteIds] = await Promise.all([
    searchListings(filters, { sellerId: seller.id }),
    getCities(),
    getMyFavoriteIds(),
  ])
  const city = cities.find((c) => c.slug === seller.city_slug)
  const avatar = avatarUrl(seller.avatar_path)
  const name = seller.seller_type === 'business' ? (seller.business_name ?? seller.display_name) : seller.display_name

  return (
    <div className="container-page py-8 sm:py-10">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="grid-noise pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- pre-optimised 320px avatar
            <img src={avatar} alt="" width={88} height={88} className="size-22 rounded-2xl object-cover" />
          ) : (
            <span className="grid size-22 place-items-center rounded-2xl bg-surface-2 text-silver">
              {seller.seller_type === 'business' ? <StoreIcon size={34} /> : <UserIcon size={34} />}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold sm:text-3xl">
              {name}
              {seller.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success">
                  <ShieldCheckIcon size={14} /> Təsdiqlənmiş satıcı
                </span>
              ) : null}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span>{t.sellerTypes[seller.seller_type]}</span>
              {city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon size={14} />
                  {city.name}
                </span>
              ) : null}
              <span>Partivo-da {formatDate(seller.created_at)} tarixindən</span>
              <span>{formatNumber(result.total)} aktiv elan</span>
            </p>
            {seller.business_description ? (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed whitespace-pre-line text-muted">{seller.business_description}</p>
            ) : null}
            {seller.business_address ? <p className="mt-2 text-sm text-subtle">Ünvan: {seller.business_address}</p> : null}
          </div>
        </div>
      </section>

      <h2 className="mt-10 mb-5 text-xl font-bold">Elanlar</h2>
      {result.items.length ? (
        <>
          <ListingGrid cards={result.items} favoriteIds={favoriteIds} />
          <Pagination page={result.page} pageCount={result.pageCount} href={(p) => `/satici/${seller.id}${p > 1 ? `?page=${p}` : ''}`} />
        </>
      ) : (
        <EmptyState icon={<PackageIcon size={26} />} title="Aktiv elan yoxdur" description="Bu satıcının hazırda aktiv elanı yoxdur." />
      )}
    </div>
  )
}
