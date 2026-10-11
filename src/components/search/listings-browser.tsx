import Link from 'next/link'
import { ListingGrid } from '@/components/listings/listing-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { ButtonLink } from '@/components/ui/button'
import { SearchIcon, XIcon } from '@/components/icons'
import { FilterPanel, type FilterOptions } from '@/components/search/filter-panel'
import { SortSelect } from '@/components/search/sort-select'
import { getCategories, getCities, getMakes, getModels } from '@/lib/data/catalog'
import { getMyFavoriteIds } from '@/lib/data/favorites'
import { searchListings } from '@/lib/data/listings'
import { activeFilterCount, buildSearchQuery, type SearchFilters } from '@/lib/search-params'
import { formatNumber, formatPrice } from '@/lib/format'
import { t } from '@/i18n'

export async function getFilterOptions(): Promise<FilterOptions> {
  const [categories, makes, models, cities] = await Promise.all([getCategories(), getMakes(), getModels(), getCities()])
  const bySlug = new Map(categories.map((c) => [c.id, c.slug]))
  const parents = categories.filter((c) => c.parent_id === null)
  const ordered = parents.flatMap((p) => [p, ...categories.filter((c) => c.parent_id === p.id)])
  return {
    categories: ordered.map((c) => ({ slug: c.slug, name: c.name, parentSlug: c.parent_id ? (bySlug.get(c.parent_id) ?? null) : null })),
    makes: makes.map(({ id, slug, name }) => ({ id, slug, name })),
    models: models.map(({ make_id, slug, name }) => ({ make_id, slug, name })),
    cities,
  }
}

function Chips({ basePath, filters, labels }: { basePath: string; filters: SearchFilters; labels: Record<string, string> }) {
  const chips: { key: string; label: string; next: Partial<SearchFilters> }[] = []
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”`, next: { q: null } })
  if (filters.category && labels.category) chips.push({ key: 'category', label: labels.category, next: { category: null } })
  if (filters.make && labels.make) chips.push({ key: 'make', label: labels.make, next: { make: null, model: null } })
  if (filters.model && labels.model) chips.push({ key: 'model', label: labels.model, next: { model: null } })
  if (filters.year) chips.push({ key: 'year', label: `${filters.year} il`, next: { year: null } })
  if (filters.oem) chips.push({ key: 'oem', label: `OEM: ${filters.oem}`, next: { oem: null } })
  if (filters.priceMin != null) chips.push({ key: 'pmin', label: `min ${formatPrice(filters.priceMin)}`, next: { priceMin: null } })
  if (filters.priceMax != null) chips.push({ key: 'pmax', label: `maks ${formatPrice(filters.priceMax)}`, next: { priceMax: null } })
  for (const c of filters.conditions) chips.push({ key: `c-${c}`, label: t.conditions[c], next: { conditions: filters.conditions.filter((x) => x !== c) } })
  if (filters.region) chips.push({ key: 'region', label: filters.region, next: { region: null, cities: [] } })
  for (const c of filters.cities) chips.push({ key: `city-${c}`, label: labels[`city:${c}`] ?? c, next: { cities: filters.cities.filter((x) => x !== c) } })
  if (filters.seller) chips.push({ key: 'seller', label: t.sellerTypes[filters.seller], next: { seller: null } })
  if (filters.delivery) chips.push({ key: 'delivery', label: 'Çatdırılma', next: { delivery: false } })
  if (filters.verified) chips.push({ key: 'verified', label: 'Təsdiqlənmiş satıcı', next: { verified: false } })
  if (filters.promoted) chips.push({ key: 'promoted', label: 'Reklamlı elanlar', next: { promoted: false } })
  if (!chips.length) return null

  return (
    <ul className="mb-5 flex flex-wrap gap-2" aria-label="Aktiv filtrlər">
      {chips.map((chip) => {
        const query = buildSearchQuery({ ...filters, ...chip.next, page: 1 })
        return (
          <li key={chip.key}>
            <Link
              href={`${basePath}${query ? `?${query}` : ''}`}
              scroll={false}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface pr-2.5 pl-3 text-xs font-medium text-fg transition-colors hover:border-danger"
              aria-label={`Filtri sil: ${chip.label}`}
            >
              {chip.label}
              <XIcon size={13} className="text-subtle" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export async function ListingsBrowser({
  basePath,
  filters,
  heading,
  description,
  lockCategory = false,
}: {
  basePath: string
  filters: SearchFilters
  heading: string
  description?: string
  lockCategory?: boolean
}) {
  const [result, options, favoriteIds] = await Promise.all([searchListings(filters), getFilterOptions(), getMyFavoriteIds()])
  const activeCount = activeFilterCount(filters) - (lockCategory && filters.category ? 1 : 0)
  const labels: Record<string, string> = {
    ...(result.resolved.categoryName && !lockCategory ? { category: result.resolved.categoryName } : {}),
    ...(result.resolved.makeName ? { make: result.resolved.makeName } : {}),
    ...(result.resolved.modelName ? { model: result.resolved.modelName } : {}),
    ...Object.fromEntries(options.cities.map((c) => [`city:${c.slug}`, c.name])),
  }
  const chipFilters = lockCategory ? { ...filters, category: null } : filters
  const pageHref = (page: number) => {
    const q = buildSearchQuery({ ...filters, category: lockCategory ? null : filters.category, page })
    return `${basePath}${q ? `?${q}` : ''}`
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{heading}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-[18.5rem_1fr] lg:gap-8">
        <FilterPanel
          basePath={basePath}
          filters={lockCategory ? { ...filters, category: null } : filters}
          options={options}
          lockCategory={lockCategory}
          activeCount={activeCount}
        />
        <section aria-label="Axtarış nəticələri" className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              <span className="font-bold text-fg">{formatNumber(result.total)}</span> {t.common.results}
            </p>
            <SortSelect basePath={basePath} filters={lockCategory ? { ...filters, category: null } : filters} />
          </div>
          <Chips basePath={basePath} filters={chipFilters} labels={labels} />
          {result.items.length ? (
            <>
              <ListingGrid cards={result.items} favoriteIds={favoriteIds} priorityCount={4} />
              <Pagination page={result.page} pageCount={result.pageCount} href={pageHref} />
            </>
          ) : (
            <EmptyState
              icon={<SearchIcon size={26} />}
              title="Uyğun elan tapılmadı"
              description={
                <ul className="space-y-1 text-left">
                  <li>• Daha qısa və ya ümumi söz yazın (məsələn, &quot;fara&quot;).</li>
                  <li>• OEM kodunu boşluq və tire olmadan yoxlayın.</li>
                  <li>• Model, il və ya qiymət filtrlərini genişləndirin.</li>
                </ul>
              }
              action={
                <>
                  {activeCount > 0 || filters.q ? (
                    <ButtonLink href={basePath} variant="secondary">
                      {t.common.clearAll}
                    </ButtonLink>
                  ) : null}
                  <ButtonLink href="/elan-yerlesdir">Elan yerləşdir</ButtonLink>
                </>
              }
            />
          )}
        </section>
      </div>
    </div>
  )
}
