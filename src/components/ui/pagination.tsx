import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'

function pageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const sorted = [...new Set([1, total, current - 1, current, current + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap')
    out.push(p)
  })
  return out
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null
  const cell = 'grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-semibold transition-colors'
  return (
    <nav aria-label="Səhifələr" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${cell} border border-line hover:bg-surface-2`} aria-label="Əvvəlki səhifə" rel="prev">
          <ChevronLeftIcon size={18} />
        </Link>
      ) : null}
      {pageList(page, pageCount).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-subtle" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${cell} ${p === page ? 'bg-accent text-accent-ink' : 'border border-line hover:bg-surface-2'}`}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={`${cell} border border-line hover:bg-surface-2`} aria-label="Növbəti səhifə" rel="next">
          <ChevronRightIcon size={18} />
        </Link>
      ) : null}
    </nav>
  )
}
