import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'
import { getCategories, getMakes, getModels } from '@/lib/data/catalog'
import { PAGE_SIZE, type SearchFilters } from '@/lib/search-params'
import type { ListingCard } from '@/lib/types'

export const CARD_COLUMNS =
  'id, ref_no, slug, title, price, is_negotiable, condition, category_name, city_name, make_name, model_name, year_from, year_to, oem_code, delivery_available, view_count, published_at, is_top, is_vip, is_premium, is_highlighted, seller_name, seller_type, seller_verified, cover_thumb_path'

function toCards(rows: unknown): ListingCard[] {
  return ((rows as ListingCard[] | null) ?? []).map((r) => ({
    ...r,
    price: r.price === null ? null : Number(r.price),
  }))
}

export interface SearchResult {
  items: ListingCard[]
  total: number
  page: number
  pageCount: number
  resolved: { categoryName: string | null; makeName: string | null; modelName: string | null }
}

export async function searchListings(filters: SearchFilters, extra: { sellerId?: string } = {}): Promise<SearchResult> {
  const empty: SearchResult = {
    items: [],
    total: 0,
    page: filters.page,
    pageCount: 0,
    resolved: { categoryName: null, makeName: null, modelName: null },
  }
  if (!isSupabaseConfigured()) return empty

  const [categories, makes, models] = await Promise.all([getCategories(), getMakes(), getModels()])
  const category = filters.category ? categories.find((c) => c.slug === filters.category) : undefined
  const make = filters.make ? makes.find((m) => m.slug === filters.make) : undefined
  const model = make && filters.model ? models.find((m) => m.make_id === make.id && m.slug === filters.model) : undefined

  // An unknown slug must yield no results rather than silently dropping the filter.
  if ((filters.category && !category) || (filters.make && !make) || (filters.model && !model)) return empty

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_listings', {
    p_query: filters.q,
    p_category_id: category?.id ?? null,
    p_make_id: make?.id ?? null,
    p_model_id: model?.id ?? null,
    p_year: filters.year,
    p_oem: filters.oem,
    p_price_min: filters.priceMin,
    p_price_max: filters.priceMax,
    p_conditions: filters.conditions.length ? filters.conditions : null,
    p_city_slugs: filters.cities.length ? filters.cities : null,
    p_region: filters.region,
    p_seller_type: filters.seller,
    p_delivery: filters.delivery || null,
    p_verified: filters.verified || null,
    p_promoted: filters.promoted || null,
    p_seller_id: extra.sellerId ?? null,
    p_sort: filters.sort,
    p_limit: PAGE_SIZE,
    p_offset: (filters.page - 1) * PAGE_SIZE,
  })
  if (error) {
    console.error('[search] failed', error.message)
    throw new Error('search_failed')
  }
  const rows = (data as (ListingCard & { total_count: number })[]) ?? []
  const total = rows.length ? Number(rows[0].total_count) : 0
  return {
    items: toCards(rows),
    total,
    page: filters.page,
    pageCount: Math.ceil(total / PAGE_SIZE),
    resolved: { categoryName: category?.name ?? null, makeName: make?.name ?? null, modelName: model?.name ?? null },
  }
}

async function publicCards(build: (q: ReturnType<Awaited<ReturnType<typeof createClient>>['from']>) => unknown) {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const base = supabase.from('listing_cards')
  const { data, error } = (await build(base)) as { data: unknown; error: { message: string } | null }
  if (error) {
    console.error('[listings] query failed', error.message)
    return []
  }
  return toCards(data)
}

export const getHomeSections = cache(async () => {
  const [premium, vip, recent] = await Promise.all([
    publicCards((t) => t.select(CARD_COLUMNS).eq('is_public', true).eq('is_premium', true).order('published_at', { ascending: false }).limit(8)),
    publicCards((t) => t.select(CARD_COLUMNS).eq('is_public', true).eq('is_vip', true).order('published_at', { ascending: false }).limit(8)),
    publicCards((t) => t.select(CARD_COLUMNS).eq('is_public', true).order('published_at', { ascending: false }).limit(12)),
  ])
  return { premium, vip, recent }
})

export async function getCardsByIds(ids: string[]) {
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 12)
  if (!clean.length) return []
  const cards = await publicCards((t) => t.select(CARD_COLUMNS).eq('is_public', true).in('id', clean))
  return clean.map((id) => cards.find((c) => c.id === id)).filter((c): c is ListingCard => Boolean(c))
}

export async function getSimilarListings(listing: { id: string; category_id: number | null; make_id: number | null }) {
  if (!listing.category_id) return []
  const sameMake = listing.make_id
    ? await publicCards((t) =>
        t.select(CARD_COLUMNS).eq('is_public', true).eq('category_id', listing.category_id).eq('make_id', listing.make_id)
          .neq('id', listing.id).order('published_at', { ascending: false }).limit(8),
      )
    : []
  if (sameMake.length >= 4) return sameMake
  const sameCategory = await publicCards((t) =>
    t.select(CARD_COLUMNS).eq('is_public', true).eq('category_id', listing.category_id).neq('id', listing.id)
      .order('published_at', { ascending: false }).limit(8),
  )
  const seen = new Set(sameMake.map((c) => c.id))
  return [...sameMake, ...sameCategory.filter((c) => !seen.has(c.id))].slice(0, 8)
}

export async function getSellerOtherListings(ownerId: string, excludeId: string) {
  return publicCards((t) =>
    t.select(CARD_COLUMNS).eq('is_public', true).eq('owner_id', ownerId).neq('id', excludeId)
      .order('published_at', { ascending: false }).limit(4),
  )
}

export const getTrustedBusinesses = cache(async () => {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data: sellers } = await supabase
    .from('profiles')
    .select('id, display_name, business_name, avatar_path, city_slug, created_at')
    .eq('seller_type', 'business')
    .eq('is_verified', true)
    .eq('is_suspended', false)
    .order('created_at')
    .limit(24)
  const list = (sellers ?? []) as { id: string; display_name: string; business_name: string | null; avatar_path: string | null; city_slug: string | null }[]
  if (!list.length) return []
  const { data: owned } = await supabase
    .from('listing_cards')
    .select('owner_id')
    .eq('is_public', true)
    .in('owner_id', list.map((s) => s.id))
    .limit(2000)
  const counts = new Map<string, number>()
  for (const row of (owned ?? []) as { owner_id: string }[]) counts.set(row.owner_id, (counts.get(row.owner_id) ?? 0) + 1)
  return list
    .map((s) => ({ ...s, activeListings: counts.get(s.id) ?? 0 }))
    .filter((s) => s.activeListings > 0)
    .sort((a, b) => b.activeListings - a.activeListings)
    .slice(0, 8)
})

export interface ListingDetail {
  id: string
  ref_no: number
  slug: string
  owner_id: string
  status: string
  title: string
  description: string
  price: number | null
  is_negotiable: boolean
  condition: string | null
  category_id: number | null
  city_slug: string | null
  make_id: number | null
  model_id: number | null
  year_from: number | null
  year_to: number | null
  engine_type: string | null
  engine_volume: number | null
  oem_code: string | null
  manufacturer: string | null
  originality: string | null
  compatibility_notes: string | null
  delivery_available: boolean
  pickup_available: boolean
  delivery_notes: string | null
  warranty_months: number | null
  warranty_notes: string | null
  contact_method: 'phone' | 'whatsapp' | 'both'
  view_count: number
  favorite_count: number
  moderation_note: string | null
  published_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  promo_top_until: string | null
  promo_vip_until: string | null
  promo_home_until: string | null
  category: { id: number; name: string; slug: string; parent_id: number | null } | null
  city: { name: string; region: string } | null
  make: { name: string; slug: string } | null
  model: { name: string; slug: string } | null
  owner: {
    id: string
    display_name: string
    seller_type: 'private' | 'business'
    business_name: string | null
    avatar_path: string | null
    is_verified: boolean
    created_at: string
  } | null
  images: { id: string; storage_path: string; thumb_path: string; width: number; height: number; position: number }[]
}

const DETAIL_SELECT = `
  id, ref_no, slug, owner_id, status, title, description, price, is_negotiable, condition, category_id, city_slug,
  make_id, model_id, year_from, year_to, engine_type, engine_volume, oem_code, manufacturer, originality,
  compatibility_notes, delivery_available, pickup_available, delivery_notes, warranty_months, warranty_notes,
  contact_method, view_count, favorite_count, moderation_note, published_at, expires_at, created_at, updated_at,
  promo_top_until, promo_vip_until, promo_home_until,
  category:categories(id, name, slug, parent_id),
  city:cities(name, region),
  make:vehicle_makes(name, slug),
  model:vehicle_models(name, slug),
  owner:profiles!listings_owner_id_fkey(id, display_name, seller_type, business_name, avatar_path, is_verified, created_at),
  images:listing_images(id, storage_path, thumb_path, width, height, position)
`

function normalizeDetail(row: unknown): ListingDetail | null {
  if (!row) return null
  const r = row as ListingDetail
  return {
    ...r,
    price: r.price === null ? null : Number(r.price),
    engine_volume: r.engine_volume === null ? null : Number(r.engine_volume),
    images: [...(r.images ?? [])].sort((a, b) => a.position - b.position),
  }
}

/** Fetches a listing as the current user (RLS: public listings, or the owner's own, or staff). */
export const getListingByRef = cache(async (refNo: number): Promise<ListingDetail | null> => {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase.from('listings').select(DETAIL_SELECT).eq('ref_no', refNo).maybeSingle()
  return normalizeDetail(data)
})

export const getListingById = cache(async (id: string): Promise<ListingDetail | null> => {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const supabase = await createClient()
  const { data } = await supabase.from('listings').select(DETAIL_SELECT).eq('id', id).maybeSingle()
  return normalizeDetail(data)
})

export function isPubliclyVisible(listing: Pick<ListingDetail, 'status' | 'expires_at'>) {
  return listing.status === 'active' && !!listing.expires_at && new Date(listing.expires_at) > new Date()
}
