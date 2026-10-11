import type { Metadata } from 'next'
import { ListingsBrowser } from '@/components/search/listings-browser'
import { parseSearchParams } from '@/lib/search-params'

export async function generateMetadata({ searchParams }: PageProps<'/elanlar'>): Promise<Metadata> {
  const filters = parseSearchParams(await searchParams)
  const title = filters.q ? `"${filters.q}" üzrə ehtiyat hissələri` : 'Bütün ehtiyat hissələri elanları'
  const filtered = Boolean(filters.q) || filters.page > 1 || filters.conditions.length > 0 || filters.priceMin != null
  return {
    title,
    description: 'Azərbaycanda yeni və işlənmiş avtomobil ehtiyat hissələri: OEM kodu, marka, model və qiymətə görə axtarın.',
    alternates: { canonical: '/elanlar' },
    // Arbitrary filter combinations should not be indexed as separate pages.
    robots: filtered ? { index: false, follow: true } : undefined,
  }
}

export default async function ListingsPage({ searchParams }: PageProps<'/elanlar'>) {
  const filters = parseSearchParams(await searchParams)
  return (
    <ListingsBrowser
      basePath="/elanlar"
      filters={filters}
      heading={filters.q ? `“${filters.q}” üzrə nəticələr` : 'Ehtiyat hissələri'}
    />
  )
}
