import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { absoluteUrl, isSupabaseConfigured, publicEnv } from '@/lib/env'
import { CONTENT_SLUGS } from '@/lib/data/content'
import { listingPath } from '@/lib/text'

export const revalidate = 3600

/** Only public, active listings are included (anonymous client => RLS hides everything else). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: absoluteUrl('/elanlar'), lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: absoluteUrl('/reklam'), changeFrequency: 'monthly', priority: 0.4 },
    { url: absoluteUrl('/yardim'), changeFrequency: 'monthly', priority: 0.3 },
    { url: absoluteUrl('/elaqe'), changeFrequency: 'yearly', priority: 0.2 },
    ...CONTENT_SLUGS.map((slug) => ({ url: absoluteUrl(`/${slug}`), changeFrequency: 'yearly' as const, priority: 0.2 })),
  ]
  if (!isSupabaseConfigured()) return entries

  const supabase = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, { auth: { persistSession: false } })
  const [{ data: categories }, { data: listings }] = await Promise.all([
    supabase.from('categories').select('slug, updated_at').eq('is_active', true),
    supabase.from('listing_cards').select('ref_no, slug, updated_at').eq('is_public', true).order('published_at', { ascending: false }).limit(45000),
  ])
  for (const c of (categories ?? []) as { slug: string; updated_at: string }[]) {
    entries.push({ url: absoluteUrl(`/kateqoriya/${c.slug}`), lastModified: c.updated_at, changeFrequency: 'daily', priority: 0.7 })
  }
  for (const l of (listings ?? []) as { ref_no: number; slug: string; updated_at: string }[]) {
    entries.push({ url: absoluteUrl(listingPath(l)), lastModified: l.updated_at, changeFrequency: 'weekly', priority: 0.6 })
  }
  return entries
}
