import Link from 'next/link'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FlagIcon } from '@/components/icons'
import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/format'
import { listingPath } from '@/lib/text'
import { can } from '@/lib/permissions'
import { t } from '@/i18n'
import { resolveReportAction } from '../actions'
import { AdminHeader, Flash, smallBtn } from '../ui'

const STATUS_LABEL: Record<string, string> = { open: 'Açıq', reviewing: 'Baxılır', resolved: 'Həll edilib', dismissed: 'Rədd edilib' }

interface Row {
  id: string
  reason: string
  details: string | null
  status: string
  resolution_note: string | null
  created_at: string
  listing: { id: string; ref_no: number; slug: string; title: string; status: string } | null
  reporter: { display_name: string } | null
}

export default async function ReportsPage({ searchParams }: PageProps<'/admin/sikayetler'>) {
  const viewer = await requirePermission('reports.view')
  const params = await searchParams
  const showAll = params.all === '1'
  const supabase = await createClient()
  let query = supabase
    .from('listing_reports')
    .select('id, reason, details, status, resolution_note, created_at, listing:listings(id, ref_no, slug, title, status), reporter:profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (!showAll) query = query.in('status', ['open', 'reviewing'])
  const { data } = await query
  const rows = (data ?? []) as unknown as Row[]
  const canManage = can(viewer.permissions, 'reports.manage')

  return (
    <div>
      <AdminHeader title="Şikayətlər">
        <Link href={showAll ? '/admin/sikayetler' : '/admin/sikayetler?all=1'} className={smallBtn}>{showAll ? 'Yalnız açıqlar' : 'Hamısı'}</Link>
      </AdminHeader>
      <Flash params={params} />
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} label={STATUS_LABEL[r.status] ?? r.status} />
                <span className="font-semibold">{t.reportReasons[r.reason] ?? r.reason}</span>
                <span className="text-xs text-subtle">{formatDateTime(r.created_at)} · {r.reporter?.display_name ?? 'silinmiş istifadəçi'}</span>
              </div>
              <p className="mt-2 text-sm">
                Elan:{' '}
                {r.listing ? (
                  <Link href={listingPath(r.listing)} target="_blank" className="font-semibold underline">{r.listing.title}</Link>
                ) : '—'}{' '}
                {r.listing ? <span className="text-subtle">({t.listingStatus[r.listing.status]})</span> : null}
              </p>
              {r.details ? <p className="mt-2 rounded-lg bg-surface-2 p-3 text-sm text-muted">{r.details}</p> : null}
              {r.resolution_note ? <p className="mt-2 text-xs text-subtle">Qərar: {r.resolution_note}</p> : null}
              {canManage && ['open', 'reviewing'].includes(r.status) ? (
                <form action={resolveReportAction} className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <input type="hidden" name="report_id" value={r.id} />
                  <input name="note" placeholder="Qeyd / səbəb" className="field h-8 min-h-0 min-w-56 flex-1 py-1 text-xs" />
                  <label className="flex items-center gap-1.5 text-xs text-danger">
                    <input type="checkbox" name="remove_listing" className="accent-[var(--danger)]" /> Elanı sil
                  </label>
                  {r.status === 'open' ? <button name="status" value="reviewing" className={smallBtn}>Baxılır</button> : null}
                  <button name="status" value="resolved" className={`${smallBtn} text-success`}>Həll et</button>
                  <button name="status" value="dismissed" className={smallBtn}>Əsassızdır</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<FlagIcon size={26} />} title="Açıq şikayət yoxdur" />
      )}
    </div>
  )
}
