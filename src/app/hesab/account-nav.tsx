'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/hesab', label: 'Ümumi baxış' },
  { href: '/hesab/elanlar', label: 'Elanlarım' },
  { href: '/secilmisler', label: 'Seçilmişlər' },
  { href: '/hesab/bildirisler', label: 'Bildirişlər' },
  { href: '/hesab/odenisler', label: 'Ödəniş və reklamlar' },
  { href: '/hesab/profil', label: 'Profil və əlaqə' },
  { href: '/hesab/mexfilik', label: 'Məxfilik və məlumatlar' },
]

export function AccountNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Hesab menyusu" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col">
        {LINKS.map((l) => {
          const active = l.href === '/hesab' ? pathname === '/hesab' : pathname.startsWith(l.href)
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2/60 hover:text-fg'
                }`}
              >
                {l.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
