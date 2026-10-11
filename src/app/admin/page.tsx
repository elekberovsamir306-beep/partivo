import Link from 'next/link'
import { Alert } from '@/components/ui/alert'
import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatNumber, formatPrice } from '@/lib/format'
import { t } from '@/i18n'
import { AdminHeader } from './ui'

interface Stats {
  users_total: number
  users_new_7d: number
  users_suspended: number
  listings_active: number
  listings_pending: number
  listings_sold: number
  listings_new_7d: number
  reports_open: number
  support_open: number
  promotions_active: number
  revenue_total: number
  revenue_30d: number
  payments_by_status: Record<string, number>
  daily: { day: string; users: number; listings: number }[]
}

export default async function AdminDashboard({ searchParams }: PageProps<'/admin'>) {
  await requirePermission('dashboard.view')
  const params = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_dashboard_stats')
  const s = data as Stats | null

  if (error || !s) return <Alert tone="danger">Statistika yüklənmədi.</Alert>

  const cards = [
    { label: 'Qeydiyyatlı istifadəçilər', value: formatNumber(s.users_total), sub: `+${s.users_new_7d} son 7 gündə` },
    { label: 'Aktiv elanlar', value: formatNumber(s.listings_active), sub: `+${s.listings_new_7d} yeni (7 gün)` },
    { label: 'Moderasiya gözləyir', value: formatNumber(s.listings_pending), href: '/admin/elanlar', alert: s.listings_pending > 0 },
    { label: 'Açıq şikayətlər', value: formatNumber(s.reports_open), href: '/admin/sikayetler', alert: s.reports_open > 0 },
    { label: 'Satılmış elanlar', value: formatNumber(s.listings_sold) },
    { label: 'Aktiv reklamlar', value: formatNumber(s.promotions_active) },
    { label: 'Gəlir (30 gün)', value: formatPrice(s.revenue_30d), sub: `Cəmi: ${formatPrice(s.revenue_total)}` },
    { label: 'Dəstək sorğuları', value: formatNumber(s.support_open), href: '/admin/destek' },
  ]
  const max = Math.max(1, ...s.daily.map((d) => Math.max(d.users, d.listings)))

  return (
    <div className="space-y-8">
      <AdminHeader title="Ümumi baxış" description="Gəlirə yalnız təsdiqlənmiş real (Epoint) ödənişlər daxildir." />
      {params.forbidden ? <Alert tone="warning">Bu bölmə üçün icazəniz yoxdur.</Alert> : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <>
              <p className="text-sm text-muted">{c.label}</p>
              <p className={`mt-2 font-display text-3xl font-extrabold tabular-nums ${c.alert ? 'text-accent-text' : ''}`}>{c.value}</p>
              {c.sub ? <p className="mt-1 text-xs text-subtle">{c.sub}</p> : null}
            </>
          )
          return c.href ? (
            <Link key={c.label} href={c.href} className="card p-5 transition-colors hover:border-line-strong">{inner}</Link>
          ) : (
            <div key={c.label} className="card p-5">{inner}</div>
          )
        })}
      </div>

      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Son 30 gün</h2>
          <div className="flex gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-accent" />Yeni elanlar</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-silver" />Yeni istifadəçilər</span>
          </div>
        </div>
        <div className="flex h-44 items-end gap-1" role="img" aria-label="Son 30 gündə yeni istifadəçilər və elanlar">
          {s.daily.map((d) => (
            <div key={d.day} className="flex h-full flex-1 items-end gap-px" title={`${d.day}: ${d.listings} elan, ${d.users} istifadəçi`}>
              <div className="flex-1 rounded-t-sm bg-accent" style={{ height: `${(d.listings / max) * 100}%`, minHeight: d.listings ? 2 : 0 }} />
              <div className="flex-1 rounded-t-sm bg-silver/70" style={{ height: `${(d.users / max) * 100}%`, minHeight: d.users ? 2 : 0 }} />
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="mb-3 font-bold">Ödənişlər statusa görə</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(s.payments_by_status).length ? (
            Object.entries(s.payments_by_status).map(([status, n]) => (
              <span key={status} className="rounded-xl bg-surface-2 px-4 py-2 text-sm">
                {t.paymentStatus[status] ?? status}: <strong>{n}</strong>
              </span>
            ))
          ) : (
            <p className="text-sm text-muted">Hələ ödəniş yoxdur.</p>
          )}
        </div>
      </section>
    </div>
  )
}
