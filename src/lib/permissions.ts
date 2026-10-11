/** Mirrors public.role_permissions. The database is the source of truth; this list is for typing and UI. */
export const PERMISSIONS = [
  'dashboard.view',
  'users.view',
  'users.suspend',
  'users.verify',
  'listings.view_all',
  'listings.moderate',
  'reports.view',
  'reports.manage',
  'catalog.manage',
  'packages.manage',
  'payments.view',
  'payments.manage',
  'settings.manage',
  'content.manage',
  'support.manage',
  'audit.view',
  'staff.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export function can(permissions: readonly string[], permission: Permission) {
  return permissions.includes(permission)
}

export const ADMIN_NAV: { href: string; label: string; permission: Permission }[] = [
  { href: '/admin', label: 'Ümumi baxış', permission: 'dashboard.view' },
  { href: '/admin/elanlar', label: 'Moderasiya', permission: 'listings.view_all' },
  { href: '/admin/sikayetler', label: 'Şikayətlər', permission: 'reports.view' },
  { href: '/admin/istifadeciler', label: 'İstifadəçilər', permission: 'users.view' },
  { href: '/admin/odenisler', label: 'Ödənişlər', permission: 'payments.view' },
  { href: '/admin/paketler', label: 'Reklam paketləri', permission: 'packages.manage' },
  { href: '/admin/kataloq', label: 'Kateqoriya və markalar', permission: 'catalog.manage' },
  { href: '/admin/destek', label: 'Dəstək sorğuları', permission: 'support.manage' },
  { href: '/admin/mezmun', label: 'Məzmun və elanlar', permission: 'content.manage' },
  { href: '/admin/parametrler', label: 'Parametrlər', permission: 'settings.manage' },
  { href: '/admin/heyet', label: 'Heyət və rollar', permission: 'staff.manage' },
  { href: '/admin/audit', label: 'Audit jurnalı', permission: 'audit.view' },
]
