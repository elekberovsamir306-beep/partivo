import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { ButtonLink } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { EyeIcon, HeartIcon, ImageIcon, PackageIcon, PlusIcon } from '@/components/icons'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getListingSettings } from '@/lib/data/catalog'
import { daysUntil, formatDate, formatPrice, isFuture } from '@/lib/format'
import { listingImageUrl } from '@/lib/storage'
import { listingPath } from '@/lib/text'
import { t } from '@/i18n'
import { ListingRowActions } from './row-actions'

export const metadata: Metadata = { title: 'Elanlarım', robots: { index: false } }

const TABS = [
  { key: 'all', label: 'Hamısı' },
  { key: 'active', label: 'Aktiv' },
  { key: 'pending', label: 'Moderasiyada' },
  { key: 'draft', label: 'Qaralama' },
  { key: 'paused', label: 'Dayandırılıb' },
  { key: 'expired', label: 'Müddəti bitib' },
  { key: 'sold', label: 'Satılıb' },
  { key: 'rejected', label: 'Rədd edilib' },
]

interface Row {
  id: string
  ref_no: number
  slug: string
  title: string
  status: string
  price: number | null
  view_count: number
  favorite_count: number
  expires_at: string | null
  updated_at: string
  moderation_note: string | null
  promo_top_until: string | null
  promo_vip_until: string | null
  promo_home_until: string | null
  images: { thumb_path: string; position: number }[]
}

export default async function MyListingsPage({ searchParams }: PageProps<'/hesab/elanlar'>) {
  const user = await requireUser('/hesab/elanlar')
  const params = await searchParams
  const tab = TABS.find((x) => x.key === params.status)?.key ?? 'all'
  const supabase = await createClient()
  let query = supabase
    .from('listings')
    .select('id, ref_no, slug, title, status, price, view_count, favorite_count, expires_at, updated_at, moderation_note, promo_top_until, promo_vip_until, promo_home_until, images:listing_images(thumb_path, position)')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (tab !== 'all') query = query.eq('status', tab)
  const [{ data }, settings] = await Promise.all([query, getListingSettings()])
  const rows = (data ?? []) as Row[]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Elanlarım</h1>
        <ButtonLink href="/elan-yerlesdir">
          <PlusIcon size={18} /> Yeni elan
        </ButtonLink>
      </div>
      <nav aria-label="Status filtri" className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((x) => (
          <Link
            key={x.key}
            href={x.key === 'all' ? '/hesab/elanlar' : `/hesab/elanlar?status=${x.key}`}
            aria-current={tab === x.key ? 'page' : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${tab === x.key ? 'bg-fg text-bg' : 'border border-line text-muted hover:text-fg'}`}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((row) => {
            const cover = [...row.images].sort((a, b) => a.position - b.position)[0]
            const expiresIn = row.expires_at ? daysUntil(row.expires_at) : null
            const canRenew =
              row.status === 'expired' || (row.status === 'active' && expiresIn !== null && expiresIn <= settings.renewal_window_days)
            const promoted = [row.promo_home_until, row.promo_vip_until, row.promo_top_until].some(isFuture)
            return (
              <li key={row.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-32">
                  {cover ? (
                    <Image src={listingImageUrl(cover.thumb_path) ?? ''} alt="" fill unoptimized sizes="128px" className="object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-subtle"><ImageIcon /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.status} label={t.listingStatus[row.status] ?? row.status} />
                    {promoted ? <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-accent-ink">REKLAM</span> : null}
                    <span className="text-xs text-subtle">№ {row.ref_no}</span>
                  </div>
                  <p className="mt-1.5 truncate font-semibold">
                    {row.status === 'active' ? <Link href={listingPath(row)} className="hover:underline">{row.title || 'Başlıqsız'}</Link> : row.title || 'Başlıqsız qaralama'}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="font-semibold text-fg">{formatPrice(row.price)}</span>
                    <span className="inline-flex items-center gap-1"><EyeIcon size={13} />{row.view_count}</span>
                    <span className="inline-flex items-center gap-1"><HeartIcon size={13} />{row.favorite_count}</span>
                    {row.status === 'active' && row.expires_at ? <span>Bitmə tarixi: {formatDate(row.expires_at)}</span> : null}
                  </p>
                  {row.status === 'rejected' && row.moderation_note ? <p className="mt-1.5 text-xs text-danger">Səbəb: {row.moderation_note}</p> : null}
                </div>
                <ListingRowActions id={row.id} status={row.status} canRenew={canRenew} />
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<PackageIcon size={26} />}
          title={tab === 'all' ? 'Hələ elanınız yoxdur' : 'Bu statusda elan yoxdur'}
          description="İlk elanınızı bir neçə dəqiqəyə yerləşdirin."
          action={<ButtonLink href="/elan-yerlesdir">Elan yerləşdir</ButtonLink>}
        />
      )}
    </div>
  )
}
