import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/format'
import { AdminHeader, td, th } from '../ui'

export default async function AuditPage({ searchParams }: PageProps<'/admin/audit'>) {
  await requirePermission('audit.view')
  const params = await searchParams
  const entity = typeof params.entity === 'string' ? params.entity.replace(/[^a-z_]/g, '') : ''
  const supabase = await createClient()
  let query = supabase.from('audit_logs').select('id, actor_id, action, entity_type, entity_id, details, created_at').order('created_at', { ascending: false }).limit(200)
  if (entity) query = query.eq('entity_type', entity)
  const { data } = await query
  const rows = (data ?? []) as { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; details: unknown; created_at: string }[]

  return (
    <div>
      <AdminHeader title="Audit jurnalı" description="Bütün imtiyazlı əməliyyatlar avtomatik qeydə alınır və dəyişdirilə bilməz.">
        <form><input name="entity" defaultValue={entity} placeholder="cədvəl (məs. listings)" className="field h-10 min-h-0 w-56 py-1.5 text-sm" /></form>
      </AdminHeader>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[50rem] text-sm">
          <thead className="border-b border-line"><tr><th className={th}>Tarix</th><th className={th}>Əməliyyat</th><th className={th}>Obyekt</th><th className={th}>İcraçı</th><th className={th}>Detallar</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(r.created_at)}</td>
                <td className={`${td} font-semibold`}>{r.action}</td>
                <td className={td}>{r.entity_type}<span className="block font-mono text-xs text-subtle">{r.entity_id}</span></td>
                <td className={`${td} font-mono text-xs text-subtle`}>{r.actor_id ?? 'sistem'}</td>
                <td className={td}>
                  <details>
                    <summary className="cursor-pointer text-xs text-accent-text">Bax</summary>
                    <pre className="mt-2 max-w-md overflow-x-auto rounded bg-surface-2 p-2 text-[11px]">{JSON.stringify(r.details, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="p-6 text-sm text-muted">Qeyd yoxdur.</p> : null}
      </div>
    </div>
  )
}
