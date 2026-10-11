import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { t } from '@/i18n'
import { setSuspensionAction, setVerifiedAction } from '../actions'
import { AdminHeader, Flash, smallBtn, td, th } from '../ui'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Row {
  id: string
  display_name: string
  seller_type: string
  business_name: string | null
  is_verified: boolean
  is_suspended: boolean
  created_at: string
  private: { email: string | null; phone: string | null; suspended_reason: string | null } | null
}

export default async function UsersPage({ searchParams }: PageProps<'/admin/istifadeciler'>) {
  const viewer = await requirePermission('users.view')
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 80) : ''
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('id, display_name, seller_type, business_name, is_verified, is_suspended, created_at, private:profile_private(email, phone, suspended_reason)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (q) {
    if (UUID.test(q)) query = query.eq('id', q)
    else if (q.includes('@')) {
      const { data: match } = await supabase.from('profile_private').select('id').ilike('email', `%${q.replace(/[%_]/g, '')}%`).limit(50)
      query = query.in('id', ((match ?? []) as { id: string }[]).map((m) => m.id))
    } else query = query.ilike('display_name', `%${q.replace(/[%_]/g, '')}%`)
  }
  const { data } = await query
  const rows = (data ?? []) as unknown as Row[]
  const returnTo = `/admin/istifadeciler${q ? `?q=${encodeURIComponent(q)}` : ''}`

  return (
    <div>
      <AdminHeader title="İstifadəçilər">
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Ad, e-poçt və ya ID" className="field h-10 min-h-0 w-64 py-1.5 text-sm" />
        </form>
      </AdminHeader>
      <Flash params={params} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="border-b border-line">
            <tr><th className={th}>İstifadəçi</th><th className={th}>Növ</th><th className={th}>Qeydiyyat</th><th className={th}>Status</th><th className={th}>Əməliyyatlar</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className={td}>
                  <Link href={`/satici/${u.id}`} target="_blank" className="font-semibold hover:underline">{u.display_name}</Link>
                  {u.business_name ? <span className="block text-xs text-muted">{u.business_name}</span> : null}
                  <span className="block text-xs text-subtle">{u.private?.email}</span>
                </td>
                <td className={td}>{t.sellerTypes[u.seller_type]}</td>
                <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(u.created_at)}</td>
                <td className={td}>
                  <div className="flex flex-col items-start gap-1">
                    {u.is_suspended ? <Badge tone="danger">Dayandırılıb</Badge> : <Badge tone="success">Aktiv</Badge>}
                    {u.is_verified ? <Badge tone="success">Təsdiqlənmiş</Badge> : null}
                    {u.private?.suspended_reason ? <span className="text-xs text-subtle">{u.private.suspended_reason}</span> : null}
                  </div>
                </td>
                <td className={td}>
                  <div className="flex flex-col gap-2">
                    {can(viewer.permissions, 'users.verify') ? (
                      <form action={setVerifiedAction}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="verified" value={u.is_verified ? '0' : '1'} />
                        <input type="hidden" name="return_to" value={returnTo} />
                        <button className={smallBtn}>{u.is_verified ? 'Təsdiqi götür' : 'Satıcını təsdiqlə'}</button>
                      </form>
                    ) : null}
                    {can(viewer.permissions, 'users.suspend') && u.id !== viewer.id ? (
                      <form action={setSuspensionAction} className="flex gap-1.5">
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="suspend" value={u.is_suspended ? '0' : '1'} />
                        <input type="hidden" name="return_to" value={returnTo} />
                        {!u.is_suspended ? <input name="reason" required minLength={5} placeholder="Səbəb" className="field h-8 min-h-0 w-40 py-1 text-xs" /> : null}
                        <button className={`${smallBtn} ${u.is_suspended ? 'text-success' : 'text-danger'}`}>{u.is_suspended ? 'Bərpa et' : 'Dayandır'}</button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="p-6 text-sm text-muted">İstifadəçi tapılmadı.</p> : null}
      </div>
    </div>
  )
}
