import type { Metadata } from 'next'
import { ListingGrid } from '@/components/listings/listing-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ButtonLink } from '@/components/ui/button'
import { HeartIcon } from '@/components/icons'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CARD_COLUMNS } from '@/lib/data/listings'
import type { ListingCard } from '@/lib/types'

export const metadata: Metadata = { title: 'Seçilmişlər', robots: { index: false } }

type Row = ListingCard & { is_public: boolean }

export default async function FavoritesPage() {
  const user = await requireUser('/secilmisler')
  const supabase = await createClient()
  const { data: favorites } = await supabase
    .from('favorites')
    .select('listing_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)
  const ids = ((favorites ?? []) as { listing_id: string }[]).map((f) => f.listing_id)
  const { data: cards } = ids.length
    ? await supabase.from('listing_cards').select(`${CARD_COLUMNS}, is_public`).in('id', ids)
    : { data: [] as Row[] }
  const all = ((cards ?? []) as Row[]).map((c) => ({ ...c, price: c.price === null ? null : Number(c.price) }))
  const live = ids.map((id) => all.find((c) => c.id === id)).filter((c): c is Row => Boolean(c?.is_public))
  const unavailable = ids.length - live.length

  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-3xl font-extrabold">Seçilmişlər</h1>
      <p className="mt-1.5 text-sm text-muted">Bəyəndiyiniz elanlar burada saxlanılır.</p>
      <div className="mt-8">
        {live.length ? (
          <ListingGrid cards={live} favoriteIds={new Set(ids)} />
        ) : (
          <EmptyState
            icon={<HeartIcon size={26} />}
            title="Seçilmiş elan yoxdur"
            description="Elan kartındakı ürək işarəsinə toxunaraq elanları burada saxlaya bilərsiniz."
            action={<ButtonLink href="/elanlar">Elanlara bax</ButtonLink>}
          />
        )}
        {unavailable > 0 ? (
          <p className="mt-6 text-sm text-subtle">
            {unavailable} seçilmiş elan artıq aktiv deyil (satılıb, müddəti bitib və ya silinib).
          </p>
        ) : null}
      </div>
    </div>
  )
}
