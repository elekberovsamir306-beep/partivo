import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { BellIcon } from '@/components/icons'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatRelative } from '@/lib/format'
import { NotificationControls } from './controls'

export const metadata: Metadata = { title: 'Bildirişlər', robots: { index: false } }

export default async function NotificationsPage() {
  const user = await requireUser('/hesab/bildirisler')
  const supabase = await createClient()
  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  const items = (data ?? []) as { id: string; type: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }[]
  const unread = items.filter((n) => !n.is_read).length

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Bildirişlər</h1>
          <p className="mt-1 text-sm text-muted">{unread ? `${unread} oxunmamış` : 'Hamısı oxunub'}</p>
        </div>
        {unread ? <NotificationControls mode="all" /> : null}
      </div>
      {items.length ? (
        <ul className="card divide-y divide-line">
          {items.map((n) => (
            <li key={n.id} className={`flex gap-4 p-4 sm:p-5 ${n.is_read ? '' : 'bg-accent-soft/40'}`}>
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-accent'}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}
                  {!n.is_read ? <span className="sr-only"> (oxunmamış)</span> : null}
                </p>
                {n.body ? <p className="mt-0.5 text-sm text-muted">{n.body}</p> : null}
                <p className="mt-1 text-xs text-subtle">{formatRelative(n.created_at)}</p>
              </div>
              <NotificationControls mode="single" id={n.id} isRead={n.is_read} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<BellIcon size={26} />} title="Bildiriş yoxdur" description="Elanlarınızın moderasiyası, reklamlar və ödənişlər barədə bildirişlər burada görünəcək." />
      )}
    </div>
  )
}
