'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CategoryIcon, ChevronDownIcon } from '@/components/icons'
import { t } from '@/i18n'

export interface NavCategory {
  slug: string
  name: string
  icon: string | null
}

export function CategoryMenu({ categories }: { categories: NavCategory[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="category-menu"
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        {t.nav.categories}
        <ChevronDownIcon size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div
          id="category-menu"
          className="absolute left-0 mt-2 grid w-[min(40rem,90vw)] grid-cols-2 gap-1 rounded-2xl border border-line bg-elevated p-2 shadow-float"
        >
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/kateqoriya/${c.slug}`}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-silver transition-colors group-hover:bg-accent-soft group-hover:text-accent-text">
                <CategoryIcon icon={c.icon} size={18} />
              </span>
              {c.name}
            </Link>
          ))}
          {categories.length === 0 ? <p className="col-span-2 p-4 text-sm text-muted">Kateqoriyalar yüklənmədi.</p> : null}
        </div>
      ) : null}
    </div>
  )
}
