import Link from 'next/link'
import { StatusBadge } from '@/components/ui/badge'
import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, formatPrice } from '@/lib/format'
import { can } from '@/lib/permissions'
import { t } from '@/i18n'
import { recordRefundAction } from '../actions'
import { AdminHeader, Flash, smallBtn, td, th } from '../ui'

const STATUSES = ['all', 'pending', 'succeeded', 'failed', 'refunded'] as const

interface Row {
  id: string
  provider: string
  provider_transaction: string | null
  amount: number
  status: string
  provider_status: string | null
  provider_message: string | null
  card_mask: string | null
  created_at: string
  confirmed_at: string | null
  user: { id: string; display_name: string } | null
  order: { status: string; package_snapshot: { name: string }; listing: { title: string } | null } | null
}

export default async function AdminPaymentsPage({ searchParams }: PageProps<'/admin/odenisler'>) {
  const viewer = await requirePermission('payments.view')
  const params = await searchParams
  const status = STATUSES.find((s) => s === params.status) ?? 'all'
  const supabase = await createClient()
  let query = supabase
    .from('payments')
    .select('id, provider, provider_transaction, amount, status, provider_status, provider_message, card_mask, created_at, confirmed_at, user:profiles(id, display_name), order:promotion_orders(status, package_snapshot, listing:listings(title))')
    .order('created_at', { ascending: false })
    .limit(100)
  if (status !== 'all') query = query.eq('status', status)
  const { data } = await query
  const rows = (data ?? []) as unknown as Row[]
  const canRefund = can(viewer.permissions, 'payments.manage')

  return (
    <div>
      <AdminHeader title="Ödənişlər" description="Kart nömrələri saxlanılmır; yalnız provayderin qaytardığı maskalanmış nömrə göstərilir." />
      <Flash params={params} />
      <nav className="mb-5 flex gap-1.5 overflow-x-auto">
        {STATUSES.map((s) => (
          <Link key={s} href={s === 'all' ? '/admin/odenisler' : `/admin/odenisler?status=${s}`} aria-current={status === s ? 'page' : undefined} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${status === s ? 'bg-fg text-bg' : 'border border-line text-muted'}`}>
            {s === 'all' ? 'Hamısı' : t.paymentStatus[s]}
          </Link>
        ))}
      </nav>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="border-b border-line">
            <tr><th className={th}>Tarix</th><th className={th}>İstifadəçi / elan</th><th className={th}>Paket</th><th className={th}>Məbləğ</th><th className={th}>Status</th><th className={th}>Provayder</th><th className={th}></th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(p.created_at)}</td>
                <td className={td}>
                  <span className="font-semibold">{p.user?.display_name ?? '(silinmiş)'}</span>
                  <span className="block max-w-56 truncate text-xs text-subtle">{p.order?.listing?.title ?? '—'}</span>
                </td>
                <td className={td}>{p.order?.package_snapshot.name}</td>
                <td className={`${td} tabular-nums`}>{formatPrice(p.amount)}</td>
                <td className={td}>
                  <StatusBadge status={p.status} label={t.paymentStatus[p.status] ?? p.status} />
                  {p.provider_message ? <span className="mt-1 block text-xs text-subtle">{p.provider_message}</span> : null}
                </td>
                <td className={td}>
                  <span className={p.provider === 'mock' ? 'font-bold text-warning' : ''}>{p.provider === 'mock' ? 'TEST' : 'Epoint'}</span>
                  <span className="block font-mono text-xs text-subtle">{p.provider_transaction ?? '—'}</span>
                  {p.card_mask ? <span className="block font-mono text-xs text-subtle">{p.card_mask}</span> : null}
                </td>
                <td className={td}>
                  {canRefund && p.status === 'succeeded' ? (
                    <form action={recordRefundAction} className="flex flex-col gap-1.5">
                      <input type="hidden" name="payment_id" value={p.id} />
                      <input name="note" required minLength={5} placeholder="Geri qaytarma qeydi" className="field h-8 min-h-0 w-44 py-1 text-xs" />
                      <button className={smallBtn}>Geri qaytarıldı kimi qeyd et</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="p-6 text-sm text-muted">Ödəniş yoxdur.</p> : null}
      </div>
      <p className="mt-4 text-xs text-subtle">
        “Geri qaytarıldı kimi qeyd et” pulu avtomatik qaytarmır: geri ödənişi əvvəlcə Epoint kabinetində icra edin, sonra burada qeyd edin. Bu, reklamı dayandırır və audit jurnalına yazılır.
      </p>
    </div>
  )
}
