import Link from 'next/link'
import { Suspense } from 'react'
import { Logo } from '@/components/logo'
import { ButtonLink } from '@/components/ui/button'
import { BellIcon, HeartIcon, PlusIcon } from '@/components/icons'
import { getViewer } from '@/lib/auth'
import { getCategoryTree } from '@/lib/data/catalog'
import { avatarUrl } from '@/lib/storage'
import { t } from '@/i18n'
import { HeaderSearch } from './header-search'
import { UserMenu } from './user-menu'
import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'
import { CategoryMenu } from './category-menu'

export async function SiteHeader() {
  const [viewer, categories] = await Promise.all([getViewer(), getCategoryTree()])
  const isStaff = (viewer?.permissions.length ?? 0) > 0
  const navCategories = categories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-3 md:gap-5">
        <MobileNav
          categories={navCategories}
          signedIn={Boolean(viewer)}
          isStaff={isStaff}
          displayName={viewer?.profile?.display_name ?? null}
        />
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Partivo — ana səhifə">
          <Logo />
        </Link>

        <nav aria-label="Əsas naviqasiya" className="ml-2 hidden items-center gap-1 lg:flex">
          <CategoryMenu categories={navCategories} />
          <Link href="/elanlar" className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg">
            {t.nav.listings}
          </Link>
          <Link href="/reklam" className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg">
            {t.nav.pricing}
          </Link>
        </nav>

        <div className="hidden flex-1 md:block">
          <Suspense fallback={<div className="h-11 rounded-xl border border-line bg-surface" />}>
            <HeaderSearch />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <ThemeToggle />
          <Link
            href="/secilmisler"
            className="hidden size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:grid"
            aria-label={t.nav.favorites}
          >
            <HeartIcon />
          </Link>
          {viewer ? (
            <Link
              href="/hesab/bildirisler"
              className="relative grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              aria-label={`${t.nav.notifications}${viewer.unreadNotifications ? ` (${viewer.unreadNotifications} oxunmamış)` : ''}`}
            >
              <BellIcon />
              {viewer.unreadNotifications > 0 ? (
                <span className="absolute top-1.5 right-1.5 grid min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] leading-4.5 font-bold text-accent-ink">
                  {viewer.unreadNotifications > 9 ? '9+' : viewer.unreadNotifications}
                </span>
              ) : null}
            </Link>
          ) : null}
          {viewer ? (
            <UserMenu
              displayName={viewer.profile?.display_name ?? viewer.email ?? ''}
              avatar={avatarUrl(viewer.profile?.avatar_path)}
              isStaff={isStaff}
            />
          ) : (
            <Link href="/giris" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-fg hover:text-accent-text sm:block">
              {t.nav.login}
            </Link>
          )}
          <ButtonLink href="/elan-yerlesdir" size="sm" className="ml-1 hidden sm:inline-flex">
            <PlusIcon size={16} />
            {t.nav.postListing}
          </ButtonLink>
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <Suspense fallback={<div className="h-11 rounded-xl border border-line bg-surface" />}>
            <HeaderSearch />
          </Suspense>
      </div>
    </header>
  )
}
