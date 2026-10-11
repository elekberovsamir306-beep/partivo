import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'
import type { Category, CategoryNode, City, HomepageSettings, ListingSettings, VehicleMake, VehicleModel } from '@/lib/types'

export const DEFAULT_LISTING_SETTINGS: ListingSettings = {
  duration_days: 30,
  renewal_window_days: 5,
  max_active_per_user: 50,
  min_photos: 5,
  max_photos: 10,
  require_moderation: true,
}

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  sections: { premium: true, vip: true, recent: true, categories: true, makes: true, business: true },
  popular_searches: [],
}

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, parent_id, slug, name, icon, description, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')
  return (data as Category[] | null) ?? []
})

export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const all = await getCategories()
  return all
    .filter((c) => c.parent_id === null)
    .map((parent) => ({ ...parent, children: all.filter((c) => c.parent_id === parent.id) }))
})

export const getMakes = cache(async (): Promise<VehicleMake[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('vehicle_makes')
    .select('id, slug, name, is_popular, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')
  return (data as VehicleMake[] | null) ?? []
})

export const getModels = cache(async (): Promise<VehicleModel[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('vehicle_models')
    .select('id, make_id, slug, name, year_from, year_to, is_active')
    .eq('is_active', true)
    .order('name')
  return (data as VehicleModel[] | null) ?? []
})

export const getCities = cache(async (): Promise<City[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('cities')
    .select('slug, name, region, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')
  return (data as City[] | null) ?? []
})

async function getSetting<T extends object>(key: string, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback
  const supabase = await createClient()
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle()
  return { ...fallback, ...((data?.value as Partial<T> | undefined) ?? {}) }
}

export const getListingSettings = cache(() => getSetting('listings', DEFAULT_LISTING_SETTINGS))
export const getHomepageSettings = cache(() => getSetting('homepage', DEFAULT_HOMEPAGE_SETTINGS))

export const getActiveAnnouncements = cache(async () => {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('announcements')
    .select('id, title, body, level, link')
    .eq('is_active', true)
    .lte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false })
    .limit(2)
  return (data as { id: number; title: string; body: string | null; level: string; link: string | null }[] | null) ?? []
})

export const getContentPage = cache(async (slug: string) => {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('content_pages')
    .select('slug, title, body, updated_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  return data as { slug: string; title: string; body: string; updated_at: string } | null
})
