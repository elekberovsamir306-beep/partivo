'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { FilterIcon, XIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { buildSearchQuery, type SearchFilters } from '@/lib/search-params'
import type { City, VehicleMake, VehicleModel } from '@/lib/types'
import { t } from '@/i18n'

export interface FilterOptions {
  categories: { slug: string; name: string; parentSlug: string | null }[]
  makes: Pick<VehicleMake, 'id' | 'slug' | 'name'>[]
  models: Pick<VehicleModel, 'make_id' | 'slug' | 'name'>[]
  cities: City[]
}

interface Props {
  basePath: string
  filters: SearchFilters
  options: FilterOptions
  /** When the page itself is a category page, hide the category select. */
  lockCategory?: boolean
  activeCount: number
}

const YEARS = Array.from({ length: new Date().getFullYear() + 1 - 1980 + 1 }, (_, i) => new Date().getFullYear() + 1 - i)

export function FilterPanel({ basePath, filters, options, lockCategory, activeCount }: Props) {
  const [draft, setDraft] = useState(filters)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Keep the form in sync when filters change through navigation (back/forward, chips).
  const [lastFilters, setLastFilters] = useState(filters)
  if (lastFilters !== filters) {
    setLastFilters(filters)
    setDraft(filters)
  }

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (mobileOpen && !d.open) d.showModal()
    if (!mobileOpen && d.open) d.close()
  }, [mobileOpen])

  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const make = options.makes.find((m) => m.slug === draft.make)
  const models = make ? options.models.filter((m) => m.make_id === make.id) : []
  const regions = [...new Set(options.cities.map((c) => c.region))]

  function apply(event?: FormEvent) {
    event?.preventDefault()
    const query = buildSearchQuery({ ...draft, page: 1 })
    setMobileOpen(false)
    startTransition(() => router.push(`${basePath}${query ? `?${query}` : ''}`, { scroll: false }))
  }

  function clearAll() {
    const query = buildSearchQuery({ q: filters.q, sort: filters.sort })
    setMobileOpen(false)
    startTransition(() => router.push(`${basePath}${query ? `?${query}` : ''}`))
  }

  const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  const label = 'mb-1.5 block text-xs font-bold tracking-wider text-subtle uppercase'

  const form = (
    <form onSubmit={apply} className="space-y-5" aria-label={t.common.filters}>
      {!lockCategory ? (
        <div>
          <label htmlFor="f-category" className={label}>Kateqoriya</label>
          <select id="f-category" className="field" value={draft.category ?? ''} onChange={(e) => set('category', e.target.value || null)}>
            <option value="">{t.common.all}</option>
            {options.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.parentSlug ? `— ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="f-make" className={label}>Marka</label>
          <select
            id="f-make"
            className="field"
            value={draft.make ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, make: e.target.value || null, model: null }))}
          >
            <option value="">{t.common.all}</option>
            {options.makes.map((m) => (
              <option key={m.slug} value={m.slug}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-model" className={label}>Model</label>
          <select id="f-model" className="field" value={draft.model ?? ''} disabled={!make} onChange={(e) => set('model', e.target.value || null)}>
            <option value="">{t.common.all}</option>
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-year" className={label}>İl</label>
          <select id="f-year" className="field" value={draft.year ?? ''} onChange={(e) => set('year', e.target.value ? Number(e.target.value) : null)}>
            <option value="">{t.common.all}</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="f-oem" className={label}>OEM / hissə nömrəsi</label>
        <input
          id="f-oem"
          className="field font-mono uppercase"
          placeholder="məs. 04465-33450"
          maxLength={60}
          value={draft.oem ?? ''}
          onChange={(e) => set('oem', e.target.value || null)}
        />
      </div>

      <fieldset>
        <legend className={label}>Qiymət, ₼</legend>
        <div className="grid grid-cols-2 gap-3">
          <input
            aria-label="Minimum qiymət"
            className="field"
            inputMode="decimal"
            placeholder="min"
            value={draft.priceMin ?? ''}
            onChange={(e) => set('priceMin', e.target.value === '' ? null : Number(e.target.value) || 0)}
          />
          <input
            aria-label="Maksimum qiymət"
            className="field"
            inputMode="decimal"
            placeholder="maks"
            value={draft.priceMax ?? ''}
            onChange={(e) => set('priceMax', e.target.value === '' ? null : Number(e.target.value) || 0)}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>Vəziyyət</legend>
        <div className="flex flex-wrap gap-2">
          {(['new', 'used', 'refurbished'] as const).map((c) => {
            const active = draft.conditions.includes(c)
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => set('conditions', toggleIn(draft.conditions, c))}
                className={`h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                  active ? 'border-accent bg-accent-soft text-fg' : 'border-line text-muted hover:border-line-strong hover:text-fg'
                }`}
              >
                {t.conditions[c]}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label htmlFor="f-region" className={label}>Region</label>
          <select
            id="f-region"
            className="field"
            value={draft.region ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value || null, cities: [] }))}
          >
            <option value="">Bütün Azərbaycan</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-city" className={label}>Şəhər / rayon</label>
          <select
            id="f-city"
            className="field"
            value={draft.cities[0] ?? ''}
            onChange={(e) => set('cities', e.target.value ? [e.target.value] : [])}
          >
            <option value="">{t.common.all}</option>
            {options.cities
              .filter((c) => !draft.region || c.region === draft.region)
              .map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="f-seller" className={label}>Satıcı</label>
        <select
          id="f-seller"
          className="field"
          value={draft.seller ?? ''}
          onChange={(e) => set('seller', (e.target.value || null) as SearchFilters['seller'])}
        >
          <option value="">{t.common.all}</option>
          <option value="private">{t.sellerTypes.private}</option>
          <option value="business">{t.sellerTypes.business}</option>
        </select>
      </div>

      <div className="space-y-3">
        {(
          [
            ['delivery', 'Çatdırılma var'],
            ['verified', 'Yalnız təsdiqlənmiş satıcılar'],
            ['promoted', 'Yalnız VIP / PREMIUM / TOP'],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className="flex cursor-pointer items-center gap-3 text-sm text-fg">
            <input type="checkbox" className="size-4.5 accent-[var(--accent)]" checked={draft[key]} onChange={(e) => set(key, e.target.checked)} />
            {text}
          </label>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1" loading={pending}>
          {t.common.apply}
        </Button>
        {activeCount > 0 ? (
          <Button type="button" variant="ghost" onClick={clearAll}>
            {t.common.clearAll}
          </Button>
        ) : null}
      </div>
    </form>
  )

  return (
    <>
      <div className="lg:hidden">
        <Button type="button" variant="secondary" onClick={() => setMobileOpen(true)} className="w-full">
          <FilterIcon size={17} />
          {t.common.filters}
          {activeCount ? <span className="rounded-full bg-accent px-2 text-xs text-accent-ink">{activeCount}</span> : null}
        </Button>
        <dialog
          ref={dialogRef}
          onClose={() => setMobileOpen(false)}
          aria-label={t.common.filters}
          className="mt-auto mb-0 max-h-[88dvh] w-full max-w-none rounded-t-3xl bg-elevated p-0 text-fg"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-elevated px-5 py-4">
            <h2 className="text-lg font-bold">{t.common.filters}</h2>
            <button type="button" onClick={() => setMobileOpen(false)} className="grid size-10 place-items-center rounded-xl hover:bg-surface-2" aria-label={t.nav.close}>
              <XIcon />
            </button>
          </div>
          <div className="p-5">{mobileOpen ? form : null}</div>
        </dialog>
      </div>
      <aside className="hidden lg:block">
        <div className="card sticky top-24 p-5">{form}</div>
      </aside>
    </>
  )
}
