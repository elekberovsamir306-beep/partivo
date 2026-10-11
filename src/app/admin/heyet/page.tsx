import { requirePermission } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { t } from '@/i18n'
import { setStaffRoleAction } from '../actions'
import { AdminHeader, Flash, smallBtn, td, th } from '../ui'

export default async function StaffPage({ searchParams }: PageProps<'/admin/heyet'>) {
  await requirePermission('staff.manage')
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from('staff_roles').select('user_id, role, created_at').order('created_at')
  const roles = (data ?? []) as { user_id: string; role: string; created_at: string }[]
  const ids = [...new Set(roles.map((r) => r.user_id))]
  const { data: people } = ids.length
    ? await createAdminClient().from('profile_private').select('id, email').in('id', ids)
    : { data: [] }
  const email = new Map(((people ?? []) as { id: string; email: string | null }[]).map((p) => [p.id, p.email]))

  return (
    <div className="space-y-6">
      <AdminHeader title="Heyət və rollar" description="Super admin: hər şey. Moderator: elanlar, şikayətlər, istifadəçilər, kataloq. Dəstək: sorğular, ödənişlərə baxış." />
      <Flash params={params} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line"><tr><th className={th}>E-poçt</th><th className={th}>Rol</th><th className={th}>Tarix</th><th className={th}></th></tr></thead>
          <tbody className="divide-y divide-line">
            {roles.map((r) => (
              <tr key={`${r.user_id}-${r.role}`}>
                <td className={td}>{email.get(r.user_id) ?? r.user_id}</td>
                <td className={`${td} font-semibold`}>{t.roles[r.role]}</td>
                <td className={`${td} text-muted`}>{formatDate(r.created_at)}</td>
                <td className={td}>
                  <form action={setStaffRoleAction}>
                    <input type="hidden" name="user_id" value={r.user_id} />
                    <input type="hidden" name="role" value={r.role} />
                    <input type="hidden" name="grant" value="0" />
                    <button className={`${smallBtn} text-danger`}>Rolu götür</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={setStaffRoleAction} className="card flex flex-wrap items-end gap-3 p-5">
        <label className="text-sm">İstifadəçinin e-poçtu<input name="email" type="email" required className="field mt-1 w-72" /></label>
        <label className="text-sm">Rol
          <select name="role" className="field mt-1 w-44">
            {Object.entries(t.roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <input type="hidden" name="grant" value="1" />
        <button className="h-11 rounded-xl bg-accent px-5 text-sm font-bold text-accent-ink">Rol ver</button>
      </form>
    </div>
  )
}
