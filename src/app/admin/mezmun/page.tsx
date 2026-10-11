import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/format'
import { saveAnnouncementAction, saveContentPageAction } from '../actions'
import { AdminHeader, Flash, smallBtn } from '../ui'

interface Announcement {
  id: number
  title: string
  body: string | null
  level: string
  link: string | null
  is_active: boolean
}

function AnnouncementForm({ a }: { a?: Announcement }) {
  return (
    <form action={saveAnnouncementAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem_auto_auto]">
      {a ? <input type="hidden" name="id" value={a.id} /> : null}
      <input name="title" defaultValue={a?.title} required minLength={3} placeholder="Başlıq" className="field h-9 min-h-0 py-1 text-sm" />
      <input name="link" defaultValue={a?.link ?? ''} placeholder="Keçid (/reklam)" className="field h-9 min-h-0 py-1 text-sm" />
      <select name="level" defaultValue={a?.level ?? 'info'} className="field h-9 min-h-0 py-0 text-sm">
        <option value="info">Məlumat</option>
        <option value="warning">Xəbərdarlıq</option>
        <option value="success">Uğur</option>
      </select>
      <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="is_active" defaultChecked={a?.is_active ?? true} />Aktiv</label>
      <button className={smallBtn}>{a ? 'Yadda saxla' : 'Əlavə et'}</button>
      <input name="body" defaultValue={a?.body ?? ''} placeholder="Mətn (istəyə bağlı)" className="field h-9 min-h-0 py-1 text-sm sm:col-span-5" />
    </form>
  )
}

export default async function ContentAdminPage({ searchParams }: PageProps<'/admin/mezmun'>) {
  await requirePermission('content.manage')
  const params = await searchParams
  const supabase = await createClient()
  const [{ data: pages }, { data: ann }] = await Promise.all([
    supabase.from('content_pages').select('slug, title, body, is_published, updated_at').order('slug'),
    supabase.from('announcements').select('id, title, body, level, link, is_active').order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <div className="space-y-10">
      <AdminHeader title="Məzmun və elanlar" description='Format: boş sətir — yeni abzas, "## " — başlıq, "- " — siyahı. HTML qəbul edilmir.' />
      <Flash params={params} />

      <section>
        <h2 className="mb-3 text-lg font-bold">Sayt bildirişləri (yuxarı zolaq)</h2>
        <div className="card space-y-5 p-5">
          {((ann ?? []) as Announcement[]).map((a) => <AnnouncementForm key={a.id} a={a} />)}
          <div className="border-t border-line pt-5"><AnnouncementForm /></div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Səhifələr</h2>
        <p className="mb-3 text-sm text-warning">Hüquqi mətnlər (şərtlər, məxfilik, geri qaytarma) dərc edilməzdən əvvəl hüquqşünas tərəfindən yoxlanılmalıdır.</p>
        <div className="space-y-3">
          {((pages ?? []) as { slug: string; title: string; body: string; is_published: boolean; updated_at: string }[]).map((p) => (
            <details key={p.slug} className="card p-4">
              <summary className="cursor-pointer font-semibold">
                {p.title} <span className="text-xs font-normal text-subtle">/{p.slug} · {formatDateTime(p.updated_at)}</span>
              </summary>
              <form action={saveContentPageAction} className="mt-4 space-y-3">
                <input type="hidden" name="slug" value={p.slug} />
                <input name="title" defaultValue={p.title} className="field" />
                <textarea name="body" defaultValue={p.body} className="field min-h-96 font-mono text-sm" />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="is_published" defaultChecked={p.is_published} />Dərc olunub</label>
                  <button className={smallBtn}>Yadda saxla</button>
                </div>
              </form>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
