import { StatusBadge } from '@/components/ui/badge'
import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/format'
import { t } from '@/i18n'
import { updateSupportAction } from '../actions'
import { AdminHeader, Flash, smallBtn } from '../ui'

const STATUS: Record<string, string> = { open: 'Açıq', in_progress: 'İcrada', closed: 'Bağlanıb' }

interface Row {
  id: string
  name: string
  email: string
  topic: string
  subject: string
  message: string
  status: string
  staff_note: string | null
  created_at: string
}

export default async function SupportPage({ searchParams }: PageProps<'/admin/destek'>) {
  await requirePermission('support.manage')
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase
    .from('support_requests')
    .select('id, name, email, topic, subject, message, status, staff_note, created_at')
    .order('status')
    .order('created_at', { ascending: false })
    .limit(100)
  const rows = (data ?? []) as Row[]

  return (
    <div>
      <AdminHeader title="Dəstək sorğuları" description="Cavabı istifadəçinin e-poçt ünvanına göndərin, sonra statusu yeniləyin." />
      <Flash params={params} />
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={r.status} label={STATUS[r.status]} />
              <span className="font-semibold">{r.subject}</span>
              <span className="text-xs text-subtle">{t.supportTopics[r.topic]} · {formatDateTime(r.created_at)}</span>
            </div>
            <p className="mt-1 text-sm">
              {r.name} · <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject}`)}`} className="text-accent-text underline">{r.email}</a>
            </p>
            <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm whitespace-pre-line text-muted">{r.message}</p>
            <form action={updateSupportAction} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="staff_note" defaultValue={r.staff_note ?? ''} placeholder="Daxili qeyd" className="field h-8 min-h-0 min-w-56 flex-1 py-1 text-xs" />
              <select name="status" defaultValue={r.status} className="field h-8 min-h-0 w-36 py-0 text-xs">
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className={smallBtn}>Yenilə</button>
            </form>
          </li>
        ))}
      </ul>
      {!rows.length ? <p className="card p-6 text-sm text-muted">Sorğu yoxdur.</p> : null}
    </div>
  )
}
