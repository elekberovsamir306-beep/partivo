import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { RocketIcon } from '@/components/icons'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, formatPrice } from '@/lib/format'
import { t } from '@/i18n'

export const metadata: Metadata = { title: 'Ödəniş və reklamlar', robots: { index: false } }

interface OrderRow {
  id: string
  status: string
  amount: number
  package_snapshot: { name: string; duration_days: number; placements: string[] }
  starts_at: string | null
  ends_at: string | null
  created_at: string
  listing: { ref_no: number; slug: string; title: string } | null
  payments: { id: string; status: string; provider: string; card_mask: string | null; confirmed_at: string | null; created_at: string }[]
}

export default async function PaymentsPage() {
  const user = await requireUser('/hesab/odenisler')
  const supabase = await createClient()
  const { data } = await supabase
    .from('promotion_orders')
    .select('id, status, amount, package_snapshot, starts_at, ends_at, created_at, listing:listings(ref_no, slug, title), payments(id, status, provider, card_mask, confirmed_at, created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  const orders = (data ?? []) as unknown as OrderRow[]
  const active = orders.filter((o) => o.status === 'active')

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Ödəniş və reklamlar</h1>
        <ButtonLink href="/reklam" variant="secondary">Paketlər</ButtonLink>
      </div>

      {active.length ? (
        <section>
          <h2 className="mb-3 text-lg font-bold">Aktiv reklamlar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((o) => (
              <div key={o.id} className="card p-5">
                <p className="text-xs font-extrabold tracking-[0.14em] text-accent-text">{o.package_snapshot.name}</p>
                <p className="mt-1 truncate font-semibold">
                  {o.listing ? <Link href={`/elan/${o.listing.ref_no}-${o.listing.slug}`} className="hover:underline">{o.listing.title}</Link> : 'Elan silinib'}
                </p>
                <p className="mt-2 text-sm text-muted">Bitir: {formatDateTime(o.ends_at)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-bold">Tarixçə</h2>
        {orders.length ? (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="border-b border-line text-xs tracking-wider text-subtle uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tarix</th>
                  <th className="px-4 py-3 font-semibold">Elan</th>
                  <th className="px-4 py-3 font-semibold">Paket</th>
                  <th className="px-4 py-3 font-semibold">Məbləğ</th>
                  <th className="px-4 py-3 font-semibold">Reklam</th>
                  <th className="px-4 py-3 font-semibold">Ödəniş</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => {
                  const payment = [...o.payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
                  return (
                    <tr key={o.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(o.created_at)}</td>
                      <td className="max-w-56 truncate px-4 py-3">{o.listing?.title ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold">{o.package_snapshot.name} · {o.package_snapshot.duration_days} gün</td>
                      <td className="px-4 py-3 tabular-nums">{formatPrice(o.amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} label={t.orderStatus[o.status] ?? o.status} /></td>
                      <td className="px-4 py-3">
                        {payment ? (
                          <div className="flex flex-col gap-0.5">
                            <StatusBadge status={payment.status} label={t.paymentStatus[payment.status] ?? payment.status} />
                            {payment.provider === 'mock' ? <span className="text-[11px] font-bold text-warning">TEST — real ödəniş deyil</span> : null}
                            {payment.card_mask ? <span className="font-mono text-xs text-subtle">{payment.card_mask}</span> : null}
                            {payment.status === 'pending' ? <Link href={`/odenis/netice?payment=${payment.id}`} className="text-xs text-accent-text underline">Statusu yoxla</Link> : null}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<RocketIcon size={26} />}
            title="Hələ reklam almamısınız"
            description="TOP, VIP və PREMIUM xidmətləri elanınızı daha çox alıcıya göstərir."
            action={<ButtonLink href="/reklam">Paketlərə bax</ButtonLink>}
          />
        )}
      </section>
    </div>
  )
}
