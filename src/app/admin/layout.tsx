import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'
import { ADMIN_NAV } from '@/lib/permissions'
import { t } from '@/i18n'
import { AdminNav } from './admin-nav'

export const metadata: Metadata = { title: 'İdarəetmə paneli', robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  if (!viewer) redirect('/giris?next=/admin')
  // Staff status comes from public.staff_roles (via my_permissions), never from a user-editable field.
  if (!viewer.permissions.includes('dashboard.view')) redirect('/')
  const links = ADMIN_NAV.filter((l) => viewer.permissions.includes(l.permission))

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-extrabold tracking-[0.14em] text-accent-ink">ADMIN</span>
        <p className="text-sm text-muted">
          {viewer.profile?.display_name} · {viewer.permissions.includes('staff.manage') ? t.roles.super_admin : viewer.permissions.includes('listings.moderate') ? t.roles.moderator : t.roles.support}
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <AdminNav links={links.map(({ href, label }) => ({ href, label }))} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
