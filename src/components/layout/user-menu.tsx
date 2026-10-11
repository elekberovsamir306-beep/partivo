'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDownIcon, LogoutIcon } from '@/components/icons'
import { logoutAction } from '@/app/(auth)/actions'
import { t } from '@/i18n'

export function UserMenu({ displayName, avatar, isStaff }: { displayName: string; avatar: string | null; isStaff: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close when the route changes ("adjust state while rendering" pattern, no effect needed).
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const initial = displayName.trim().charAt(0).toLocaleUpperCase('az') || '?'
  const links = [
    { href: '/hesab', label: t.nav.account },
    { href: '/hesab/elanlar', label: t.nav.myListings },
    { href: '/secilmisler', label: t.nav.favorites },
    { href: '/hesab/odenisler', label: t.nav.payments },
    { href: '/hesab/profil', label: t.nav.profile },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-1.5 rounded-xl pr-2 pl-1 transition-colors hover:bg-surface-2"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar is already a 320px optimised WebP
          <img src={avatar} alt="" width={32} height={32} className="size-8 rounded-lg object-cover" />
        ) : (
          <span className="grid size-8 place-items-center rounded-lg bg-surface-3 text-sm font-bold text-silver">{initial}</span>
        )}
        <span className="sr-only">Hesab menyusu</span>
        <ChevronDownIcon size={16} className="text-subtle" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-elevated p-1.5 shadow-float">
          <p className="truncate px-3 pt-2 pb-2.5 text-sm font-semibold text-fg">{displayName}</p>
          <div className="my-1 h-px bg-line" />
          {links.map((l) => (
            <Link key={l.href} role="menuitem" href={l.href} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">
              {l.label}
            </Link>
          ))}
          {isStaff ? (
            <Link role="menuitem" href="/admin" className="block rounded-lg px-3 py-2 text-sm font-semibold text-accent-text hover:bg-surface-2">
              {t.nav.admin}
            </Link>
          ) : null}
          <div className="my-1 h-px bg-line" />
          <form action={logoutAction}>
            <button role="menuitem" type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg">
              <LogoutIcon size={16} />
              {t.nav.logout}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
