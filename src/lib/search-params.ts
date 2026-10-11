/**
 * Search filters <-> URL query string. Shared by server pages (parsing) and client filter UI (building),
 * so every search result page is shareable and bookmarkable.
 */
export const SORTS = ['relevance', 'newest', 'price_asc', 'price_desc', 'views'] as const
export type Sort = (typeof SORTS)[number]

export const PAGE_SIZE = 24

export interface SearchFilters {
  q: string | null
  category: string | null
  make: string | null
  model: string | null
  year: number | null
  oem: string | null
  priceMin: number | null
  priceMax: number | null
  conditions: string[]
  cities: string[]
  region: string | null
  seller: 'private' | 'business' | null
  delivery: boolean
  verified: boolean
  promoted: boolean
  sort: Sort
  page: number
}

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams

function first(raw: RawParams, key: string): string | null {
  const v = raw instanceof URLSearchParams ? raw.get(key) : raw[key]
  const s = Array.isArray(v) ? v[0] : v
  return s && s.trim() ? s.trim() : null
}

function list(raw: RawParams, key: string, allowed?: readonly string[]): string[] {
  const v = raw instanceof URLSearchParams ? raw.getAll(key) : raw[key]
  const values = (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(','))
  const cleaned = values.map((x) => x.trim()).filter((x) => /^[a-z0-9_-]{1,40}$/.test(x))
  return [...new Set(allowed ? cleaned.filter((x) => allowed.includes(x)) : cleaned)].slice(0, 20)
}

function num(raw: RawParams, key: string, min: number, max: number): number | null {
  const s = first(raw, key)
  if (s === null) return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

const slug = (s: string | null) => (s && /^[a-z0-9-]{1,80}$/.test(s) ? s : null)

export function parseSearchParams(raw: RawParams): SearchFilters {
  const sort = first(raw, 'sort')
  const q = first(raw, 'q')
  const parsedSort = SORTS.includes(sort as Sort) ? (sort as Sort) : null
  return {
    q: q ? q.slice(0, 120) : null,
    category: slug(first(raw, 'category')),
    make: slug(first(raw, 'make')),
    model: slug(first(raw, 'model')),
    year: num(raw, 'year', 1950, 2100),
    oem: (first(raw, 'oem') ?? '').replace(/[^A-Za-z0-9 .\-/]/g, '').slice(0, 60) || null,
    priceMin: num(raw, 'price_min', 0, 10_000_000),
    priceMax: num(raw, 'price_max', 0, 10_000_000),
    conditions: list(raw, 'condition', ['new', 'used', 'refurbished']),
    cities: list(raw, 'city'),
    region: (first(raw, 'region') ?? '').slice(0, 60) || null,
    seller: (['private', 'business'] as const).find((s) => s === first(raw, 'seller')) ?? null,
    delivery: first(raw, 'delivery') === '1',
    verified: first(raw, 'verified') === '1',
    promoted: first(raw, 'promoted') === '1',
    // Without a keyword "relevance" means nothing, so default to newest.
    sort: parsedSort ?? (q ? 'relevance' : 'newest'),
    page: Math.max(1, Math.min(400, Math.floor(num(raw, 'page', 1, 400) ?? 1))),
  }
}

export function buildSearchQuery(filters: Partial<SearchFilters>): string {
  const p = new URLSearchParams()
  if (filters.q) p.set('q', filters.q)
  if (filters.category) p.set('category', filters.category)
  if (filters.make) p.set('make', filters.make)
  if (filters.model) p.set('model', filters.model)
  if (filters.year) p.set('year', String(filters.year))
  if (filters.oem) p.set('oem', filters.oem)
  if (filters.priceMin != null) p.set('price_min', String(filters.priceMin))
  if (filters.priceMax != null) p.set('price_max', String(filters.priceMax))
  if (filters.conditions?.length) p.set('condition', filters.conditions.join(','))
  if (filters.cities?.length) p.set('city', filters.cities.join(','))
  if (filters.region) p.set('region', filters.region)
  if (filters.seller) p.set('seller', filters.seller)
  if (filters.delivery) p.set('delivery', '1')
  if (filters.verified) p.set('verified', '1')
  if (filters.promoted) p.set('promoted', '1')
  if (filters.sort && !(filters.sort === 'relevance' && filters.q) && !(filters.sort === 'newest' && !filters.q)) {
    p.set('sort', filters.sort)
  }
  if (filters.page && filters.page > 1) p.set('page', String(filters.page))
  return p.toString()
}

export function activeFilterCount(f: SearchFilters): number {
  return [
    f.category, f.make, f.model, f.year, f.oem, f.priceMin, f.priceMax, f.region, f.seller,
    f.delivery || null, f.verified || null, f.promoted || null,
  ].filter((v) => v !== null && v !== undefined).length + f.conditions.length + f.cities.length
}
