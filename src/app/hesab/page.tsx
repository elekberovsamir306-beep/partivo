import type { Metadata } from 'next'
import Link from 'next/link'
import { Alert } from '@/components/ui/alert'
import { ButtonLink } from '@/components/ui/button'
import { BellIcon, HeartIcon, PackageIcon, PlusIcon, RocketIcon } from '@/components/icons'
import { getViewer, requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/format'

export const metadata: Metadata = { title: 'Hesabım', robots: { index: false } }

export default async function AccountPage({ searchParams }: PageProps<'/hesab'>) {
  const user = await requireUser('/hesab')
  const params = await searchParams
  const supabase = await createClient()
  const [viewer, listings, favorites, promotions, notifications] = await Promise.all([
    getViewer(),
    supabase.from('listings').select('status').eq('owner_id', user.id),
    supabase.from('favorites').select('listing_id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('promotion_orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    supabase.from('notifications').select('id, title, body, link, is_read, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
  ])
  const statuses = ((listings.data ?? []) as { status: string }[]).map((l) => l.status)
  const count = (s: string) => statuses.filter((x) => x === s).length
  const stats = [
    { label: 'Aktiv elanlar', value: count('active'), href: '/hesab/elanlar?status=active', icon: PackageIcon },
    { label: 'Moderasiyada', value: count('pending'), href: '/hesab/elanlar?status=pending', icon: PackageIcon },
    { label: 'Seçilmişlər', value: favorites.count ?? 0, href: '/secilmisler', icon: HeartIcon },
    { label: 'Aktiv reklamlar', value: promotions.count ?? 0, href: '/hesab/odenisler', icon: RocketIcon },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Salam, {viewer?.profile?.display_name ?? 'istifadəçi'}</h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <ButtonLink href="/elan-yerlesdir">
          <PlusIcon size={18} /> Yeni elan
        </ButtonLink>
      </div>

      {params.password === 'updated' ? <Alert tone="success">Şifrəniz yeniləndi.</Alert> : null}
      {viewer?.profile?.is_suspended ? (
        <Alert tone="danger" title="Hesabınız dayandırılıb">
          Elanlarınız ictimaiyyətə göstərilmir və yeni elan yerləşdirə bilməzsiniz. Ətraflı məlumat üçün{' '}
          <Link href="/elaqe" className="underline">dəstəklə əlaqə saxlayın</Link>.
        </Alert>
      ) : null}
      {count('draft') > 0 ? (
        <Alert tone="info">
          {count('draft')} tamamlanmamış qaralamanız var. <Link href="/hesab/elanlar?status=draft" className="font-semibold underline">Davam et</Link>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition-colors hover:border-line-strong">
            <s.icon size={20} className="text-accent-text" />
            <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <section className="card p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Son bildirişlər</h2>
          <Link href="/hesab/bildirisler" className="text-sm font-semibold text-accent-text">Hamısı</Link>
        </div>
        {(notifications.data ?? []).length ? (
          <ul className="divide-y divide-line">
            {(notifications.data as { id: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }[]).map((n) => (
              <li key={n.id} className="flex gap-3 py-3">
                <BellIcon size={18} className={n.is_read ? 'mt-0.5 text-subtle' : 'mt-0.5 text-accent-text'} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}</p>
                  {n.body ? <p className="truncate text-sm text-muted">{n.body}</p> : null}
                  <p className="text-xs text-subtle">{formatRelative(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-muted">Hələ bildiriş yoxdur.</p>
        )}
      </section>
    </div>
  )
}
