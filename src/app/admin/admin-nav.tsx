'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin menyusu" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col">
        {links.map((l) => {
          const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href)
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-xl px-3.5 py-2.5 text-sm font-semibold ${active ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2/60 hover:text-fg'}`}
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
