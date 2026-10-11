'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { SearchIcon } from '@/components/icons'

export function HeaderSearch({ large = false }: { large?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const initial = pathname === '/elanlar' ? (params.get('q') ?? '') : ''
  const [query, setQuery] = useState(initial)

  function submit(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    const next = new URLSearchParams(pathname === '/elanlar' ? params.toString() : '')
    next.delete('page')
    if (q) next.set('q', q)
    else next.delete('q')
    router.push(`/elanlar${next.size ? `?${next}` : ''}`)
  }

  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor={large ? 'hero-search' : 'site-search'} className="sr-only">
        Ehtiyat hissəsi axtar
      </label>
      <SearchIcon
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-subtle ${large ? 'left-5' : 'left-3.5'}`}
        size={large ? 22 : 18}
      />
      <input
        id={large ? 'hero-search' : 'site-search'}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maxLength={120}
        autoComplete="off"
        enterKeyHint="search"
        placeholder={large ? 'Hissənin adı, OEM kodu, marka və ya model…' : 'Hissə, OEM kodu, marka…'}
        className={
          large
            ? 'h-16 w-full rounded-2xl border border-line-strong bg-elevated pr-36 pl-14 text-base text-fg shadow-float transition placeholder:text-subtle focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)] focus:outline-none'
            : 'h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-sm text-fg transition placeholder:text-subtle focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none'
        }
      />
      {large ? (
        <button
          type="submit"
          className="absolute top-2 right-2 bottom-2 rounded-xl bg-accent px-6 text-sm font-bold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Axtar
        </button>
      ) : null}
    </form>
  )
}
