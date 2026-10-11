import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { getContentPage } from '@/lib/data/catalog'

export const CONTENT_SLUGS = [
  'haqqimizda',
  'elan-qaydalari',
  'istifade-sertleri',
  'mexfilik-siyaseti',
  'cookie-siyaseti',
  'odenis-ve-geri-qaytarma',
] as const

const SEED_FILE = path.join(process.cwd(), 'supabase', 'migrations', '20261010001000_content_pages.sql')

/** Initial texts from the seed migration (single source of truth) — used when the database is unreachable. */
const seedPages = cache(async () => {
  const pages = new Map<string, { title: string; body: string }>()
  try {
    const sql = await readFile(SEED_FILE, 'utf8')
    for (const m of sql.matchAll(/\('([a-z0-9-]+)',\s*'([^']+)',\s*\$body\$([\s\S]*?)\$body\$\)/g)) {
      pages.set(m[1], { title: m[2], body: m[3].trim() })
    }
  } catch {
    // file not bundled: no fallback available
  }
  return pages
})

export const loadContentPage = cache(async (slug: string) => {
  const fromDb = await getContentPage(slug).catch(() => null)
  if (fromDb) return fromDb
  const seed = (await seedPages()).get(slug)
  return seed ? { slug, title: seed.title, body: seed.body, updated_at: null as string | null } : null
})
