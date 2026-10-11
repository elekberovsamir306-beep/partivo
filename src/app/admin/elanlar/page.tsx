import Image from 'next/image'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { CheckIcon } from '@/components/icons'
import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, formatPrice } from '@/lib/format'
import { listingImageUrl } from '@/lib/storage'
import { listingPath } from '@/lib/text'
import { can } from '@/lib/permissions'
import { t } from '@/i18n'
import { moderateListingAction } from '../actions'
import { AdminHeader, Flash, smallBtn } from '../ui'

const TABS = ['pending', 'active', 'rejected', 'removed', 'flagged'] as const

interface Row {
  id: string
  ref_no: number
  slug: string
  title: string
  description: string
  status: string
  price: number | null
  flags: string[]
  moderation_note: string | null
  updated_at: string
  owner: { id: string; display_name: string; is_verified: boolean } | null
  category: { name: string } | null
  images: { thumb_path: string; position: number }[]
}

export default async function ModerationPage({ searchParams }: PageProps<'/admin/elanlar'>) {
  const viewer = await requirePermission('listings.view_all')
  const params = await searchParams
  const tab = TABS.find((x) => x === params.tab) ?? 'pending'
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 80) : ''
  const supabase = await createClient()
  let query = supabase
    .from('listings')
    .select('id, ref_no, slug, title, description, status, price, flags, moderation_note, updated_at, owner:profiles!listings_owner_id_fkey(id, display_name, is_verified), category:categories(name), images:listing_images(thumb_path, position)')
    .order('updated_at', { ascending: tab !== 'pending' ? false : true })
    .limit(50)
  query = tab === 'flagged' ? query.neq('flags', '{}') : query.eq('status', tab)
  if (q) query = /^\d{6,}$/.test(q) ? query.eq('ref_no', Number(q)) : query.ilike('title', `%${q.replace(/[%_]/g, '')}%`)
  const { data } = await query
  const rows = (data ?? []) as unknown as Row[]
  const canModerate = can(viewer.permissions, 'listings.moderate')
  const returnTo = `/admin/elanlar?tab=${tab}`

  return (
    <div>
      <AdminHeader title="Elan moderasiyası" description="Köhnədən yeniyə: ən uzun gözləyən elanlar birinci.">
        <form className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder="Başlıq və ya elan №" className="field h-10 min-h-0 w-56 py-1.5 text-sm" />
        </form>
      </AdminHeader>
      <Flash params={params} />
      <nav className="mb-5 flex gap-1.5 overflow-x-auto">
        {TABS.map((x) => (
          <Link key={x} href={`/admin/elanlar?tab=${x}`} aria-current={tab === x ? 'page' : undefined} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${tab === x ? 'bg-fg text-bg' : 'border border-line text-muted'}`}>
            {x === 'flagged' ? 'Şübhəli (bayraqlı)' : t.listingStatus[x]}
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((row) => {
            const thumbs = [...row.images].sort((a, b) => a.position - b.position).slice(0, 5)
            return (
              <li key={row.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={row.status} label={t.listingStatus[row.status] ?? row.status} />
                  {row.flags.map((f) => (
                    <span key={f} className="rounded-md bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                      {f === 'reused_images' ? 'Başqa satıcının şəkilləri' : f}
                    </span>
                  ))}
                  <span className="text-xs text-subtle">№ {row.ref_no} · {formatDateTime(row.updated_at)}</span>
                </div>
                <div className="mt-3 flex flex-col gap-4 md:flex-row">
                  <div className="flex shrink-0 gap-1.5">
                    {thumbs.map((img) => (
                      <div key={img.thumb_path} className="relative size-16 overflow-hidden rounded-lg bg-surface-2">
                        <Image src={listingImageUrl(img.thumb_path) ?? ''} alt="" fill unoptimized sizes="64px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      <Link href={listingPath(row)} className="hover:underline" target="_blank">{row.title || '(başlıqsız)'}</Link>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatPrice(row.price)} · {row.category?.name ?? '—'} · Satıcı:{' '}
                      <Link href={`/admin/istifadeciler?q=${row.owner?.id}`} className="underline">{row.owner?.display_name}</Link>
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm whitespace-pre-line text-subtle">{row.description}</p>
                    {row.moderation_note ? <p className="mt-2 text-xs text-danger">Qeyd: {row.moderation_note}</p> : null}
                  </div>
                </div>
                {canModerate ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    {row.status === 'pending' ? (
                      <form action={moderateListingAction}>
                        <input type="hidden" name="listing_id" value={row.id} />
                        <input type="hidden" name="action" value="approve" />
                        <input type="hidden" name="return_to" value={returnTo} />
                        <button className={`${smallBtn} border-transparent bg-success-soft text-success`}><CheckIcon size={14} className="mr-1" />Təsdiqlə</button>
                      </form>
                    ) : null}
                    {['removed', 'rejected'].includes(row.status) ? (
                      <form action={moderateListingAction}>
                        <input type="hidden" name="listing_id" value={row.id} />
                        <input type="hidden" name="action" value="restore" />
                        <input type="hidden" name="return_to" value={returnTo} />
                        <button className={smallBtn}>Yenidən baxışa qaytar</button>
                      </form>
                    ) : null}
                    {row.status !== 'removed' ? (
                      <form action={moderateListingAction} className="flex flex-1 flex-wrap gap-2">
                        <input type="hidden" name="listing_id" value={row.id} />
                        <input type="hidden" name="return_to" value={returnTo} />
                        <input name="reason" required minLength={5} placeholder="Səbəb (istifadəçiyə göstəriləcək)" className="field h-8 min-h-0 min-w-56 flex-1 py-1 text-xs" />
                        {['pending', 'active', 'paused'].includes(row.status) ? (
                          <button name="action" value="reject" className={`${smallBtn} text-warning`}>Rədd et</button>
                        ) : null}
                        <button name="action" value="remove" className={`${smallBtn} text-danger`}>Sil</button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState icon={<CheckIcon size={26} />} title="Növbə boşdur" description="Bu bölmədə elan yoxdur." />
      )}
    </div>
  )
}
