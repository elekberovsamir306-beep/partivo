'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { buildSearchQuery, SORTS, type SearchFilters } from '@/lib/search-params'
import { t } from '@/i18n'

export function SortSelect({ basePath, filters }: { basePath: string; filters: SearchFilters }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const sorts = filters.q ? SORTS : SORTS.filter((s) => s !== 'relevance')
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="hidden sm:inline">{t.common.sort}:</span>
      <select
        className="field h-10 min-h-0 w-auto py-1.5 text-sm"
        value={filters.sort}
        disabled={pending}
        onChange={(e) => {
          const query = buildSearchQuery({ ...filters, sort: e.target.value as SearchFilters['sort'], page: 1 })
          startTransition(() => router.push(`${basePath}${query ? `?${query}` : ''}`, { scroll: false }))
        }}
      >
        {sorts.map((s) => (
          <option key={s} value={s}>
            {t.sort[s]}
          </option>
        ))}
      </select>
    </label>
  )
}
