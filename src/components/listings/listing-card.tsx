import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon, MapPinIcon, ShieldCheckIcon, TruckIcon } from '@/components/icons'
import { formatPrice, formatRelative } from '@/lib/format'
import { listingImageUrl } from '@/lib/storage'
import { listingPath } from '@/lib/text'
import type { ListingCard as Card } from '@/lib/types'
import { t } from '@/i18n'
import { FavoriteButton } from './favorite-button'

function vehicleLine(card: Card) {
  const years =
    card.year_from && card.year_to && card.year_from !== card.year_to
      ? `${card.year_from}–${card.year_to}`
      : (card.year_from ?? card.year_to ?? '')
  return [card.make_name, card.model_name, years].filter(Boolean).join(' ')
}

export function PromoBadge({ card }: { card: Pick<Card, 'is_premium' | 'is_vip' | 'is_top'> }) {
  const label = card.is_premium ? 'PREMIUM' : card.is_vip ? 'VIP' : card.is_top ? 'TOP' : null
  if (!label) return null
  const style = card.is_premium
    ? 'bg-accent text-accent-ink'
    : card.is_vip
      ? 'bg-[#c9a24a] text-[#1b1406]'
      : 'bg-[#f3f4f6] text-[#111318]'
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-[0.12em] ${style}`}
      title="Ödənişli reklam"
    >
      {label}
      <span className="sr-only"> — ödənişli reklam</span>
    </span>
  )
}

export function ListingCard({ card, favorited = false, priority = false }: { card: Card; favorited?: boolean; priority?: boolean }) {
  const image = listingImageUrl(card.cover_thumb_path)
  const vehicle = vehicleLine(card)
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-surface transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-float ${
        card.is_highlighted ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--border))]' : 'border-line hover:border-line-strong'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {image ? (
          <Image
            src={image}
            alt={card.title}
            fill
            unoptimized
            priority={priority}
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-subtle">
            <ImageIcon size={32} />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <PromoBadge card={card} />
        </div>
        <div className="absolute top-2 right-2 z-10">
          <FavoriteButton listingId={card.id} initial={favorited} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
        <p className="font-display text-lg font-extrabold tracking-tight text-fg tabular-nums">
          {formatPrice(card.price)}
          {card.is_negotiable ? <span className="ml-1.5 align-middle text-[11px] font-semibold text-subtle">razılaşma</span> : null}
        </p>
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-fg">
          <Link href={listingPath(card)} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {card.title}
          </Link>
        </h3>
        {vehicle ? <p className="truncate text-xs text-muted">{vehicle}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-subtle">
          {card.condition ? <span className="font-medium text-silver">{t.conditions[card.condition]}</span> : null}
          {card.city_name ? (
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={13} />
              {card.city_name}
            </span>
          ) : null}
          {card.delivery_available ? (
            <span className="inline-flex items-center gap-1" title="Çatdırılma var">
              <TruckIcon size={13} />
              <span className="sr-only">Çatdırılma var</span>
            </span>
          ) : null}
          {card.seller_verified ? (
            <span className="inline-flex items-center gap-1 text-success" title="Təsdiqlənmiş satıcı">
              <ShieldCheckIcon size={13} />
              <span className="sr-only">Təsdiqlənmiş satıcı</span>
            </span>
          ) : null}
          {card.published_at ? <span className="ml-auto">{formatRelative(card.published_at)}</span> : null}
        </div>
      </div>
    </article>
  )
}

export function ListingGrid({
  cards,
  favoriteIds,
  priorityCount = 0,
}: {
  cards: Card[]
  favoriteIds?: Set<string>
  priorityCount?: number
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {cards.map((card, i) => (
        <ListingCard key={card.id} card={card} favorited={favoriteIds?.has(card.id)} priority={i < priorityCount} />
      ))}
    </div>
  )
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="skeleton aspect-[4/3]" />
          <div className="space-y-2 p-4">
            <div className="skeleton h-5 w-24 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
