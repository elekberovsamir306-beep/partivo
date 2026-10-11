import type { ReactNode } from 'react'
import { CheckIcon } from '@/components/icons'
import { formatPrice } from '@/lib/format'
import type { PromotionPackage } from '@/lib/types'
import { t } from '@/i18n'

export function PackageCard({ pkg, featured, children }: { pkg: PromotionPackage; featured?: boolean; children?: ReactNode }) {
  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-6 sm:p-7 ${
        featured ? 'border-accent bg-[linear-gradient(180deg,var(--accent-soft),transparent_60%)] shadow-float' : 'border-line bg-surface'
      }`}
    >
      {featured ? (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[11px] font-extrabold tracking-wider text-accent-ink">
          ƏN ÇOX SEÇİLƏN
        </span>
      ) : null}
      <p className="font-display text-sm font-extrabold tracking-[0.18em] text-accent-text">{pkg.name}</p>
      <p className="mt-3 font-display text-4xl font-extrabold tabular-nums">{formatPrice(pkg.price)}</p>
      <p className="mt-1 text-sm text-muted">{pkg.duration_days} gün</p>
      <p className="mt-4 text-sm leading-relaxed text-muted">{pkg.description}</p>
      <ul className="mt-5 space-y-2.5 text-sm">
        {(pkg.features.length ? pkg.features : pkg.placements.map((p) => t.placements[p] ?? p)).map((f) => (
          <li key={f} className="flex gap-2.5">
            <CheckIcon size={17} className="mt-0.5 shrink-0 text-success" />
            {f}
          </li>
        ))}
      </ul>
      {children ? <div className="mt-auto pt-7">{children}</div> : null}
    </div>
  )
}
