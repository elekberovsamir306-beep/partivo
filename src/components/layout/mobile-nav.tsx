'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CategoryIcon, MenuIcon, PlusIcon, XIcon } from '@/components/icons'
import { Logo } from '@/components/logo'
import { buttonClass } from '@/components/ui/button'
import { logoutAction } from '@/app/(auth)/actions'
import { t } from '@/i18n'
import type { NavCategory } from './category-menu'

export function MobileNav({
  categories,
  signedIn,
  isStaff,
  displayName,
}: {
  categories: NavCategory[]
  signedIn: boolean
  isStaff: boolean
  displayName: string | null
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const link = 'block rounded-xl px-3 py-3 text-base font-medium text-fg hover:bg-surface-2'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-xl text-fg hover:bg-surface-2 lg:hidden"
        aria-label={t.nav.menu}
        aria-expanded={open}
      >
        <MenuIcon />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialogRef.current && setOpen(false)}
        aria-label={t.nav.menu}
        className="m-0 h-dvh max-h-none w-[min(22rem,88vw)] max-w-none bg-elevated p-0 text-fg"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <Logo />
            <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-xl hover:bg-surface-2" aria-label={t.nav.close}>
              <XIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <Link href="/elan-yerlesdir" className={buttonClass('primary', 'md', 'mb-4 w-full')}>
              <PlusIcon size={18} />
              {t.nav.postListing}
            </Link>
            {signedIn ? (
              <>
                <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-subtle uppercase">{displayName}</p>
                <Link href="/hesab" className={link}>{t.nav.account}</Link>
                <Link href="/hesab/elanlar" className={link}>{t.nav.myListings}</Link>
                <Link href="/hesab/bildirisler" className={link}>{t.nav.notifications}</Link>
                {isStaff ? <Link href="/admin" className={`${link} text-accent-text`}>{t.nav.admin}</Link> : null}
              </>
            ) : (
              <>
                <Link href="/giris" className={link}>{t.nav.login}</Link>
                <Link href="/qeydiyyat" className={link}>{t.nav.register}</Link>
              </>
            )}
            <Link href="/elanlar" className={link}>{t.nav.listings}</Link>
            <Link href="/secilmisler" className={link}>{t.nav.favorites}</Link>
            <Link href="/reklam" className={link}>{t.nav.pricing}</Link>
            <p className="mt-5 px-3 pb-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t.nav.categories}</p>
            {categories.map((c) => (
              <Link key={c.slug} href={`/kateqoriya/${c.slug}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-fg">
                <CategoryIcon icon={c.icon} size={18} />
                {c.name}
              </Link>
            ))}
            <div className="mt-5 border-t border-line pt-4">
              <Link href="/yardim" className={link}>{t.nav.help}</Link>
              <Link href="/elaqe" className={link}>{t.nav.contact}</Link>
              {signedIn ? (
                <form action={logoutAction}>
                  <button type="submit" className={`${link} w-full text-left text-muted`}>{t.nav.logout}</button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      </dialog>
    </>
  )
}
