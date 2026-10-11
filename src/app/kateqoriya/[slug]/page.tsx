import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ListingsBrowser } from '@/components/search/listings-browser'
import { getCategories } from '@/lib/data/catalog'
import { parseSearchParams } from '@/lib/search-params'

async function findCategory(slug: string) {
  const categories = await getCategories()
  const category = categories.find((c) => c.slug === slug)
  if (!category) return null
  const parent = category.parent_id ? categories.find((c) => c.id === category.parent_id) ?? null : null
  const children = categories.filter((c) => c.parent_id === category.id)
  return { category, parent, children }
}

export async function generateMetadata({ params, searchParams }: PageProps<'/kateqoriya/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const found = await findCategory(slug)
  if (!found) return { title: 'Kateqoriya tapılmadı' }
  const filters = parseSearchParams(await searchParams)
  return {
    title: `${found.category.name} — ehtiyat hissələri`,
    description: `${found.category.name}: Azərbaycanda yeni və işlənmiş ${found.category.name.toLocaleLowerCase('az')} elanları. Qiymətləri müqayisə edin, satıcı ilə birbaşa əlaqə saxlayın.`,
    alternates: { canonical: `/kateqoriya/${slug}` },
    robots: filters.q || filters.page > 1 ? { index: false, follow: true } : undefined,
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/kateqoriya/[slug]'>) {
  const { slug } = await params
  const found = await findCategory(slug)
  if (!found) notFound()
  const filters = { ...parseSearchParams(await searchParams), category: slug }

  return (
    <>
      <nav aria-label="Naviqasiya zənciri" className="container-page pt-6 text-sm text-subtle">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-fg">Ana səhifə</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/elanlar" className="hover:text-fg">Elanlar</Link></li>
          {found.parent ? (
            <>
              <li aria-hidden="true">/</li>
              <li><Link href={`/kateqoriya/${found.parent.slug}`} className="hover:text-fg">{found.parent.name}</Link></li>
            </>
          ) : null}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-muted">{found.category.name}</li>
        </ol>
      </nav>
      {found.children.length ? (
        <div className="container-page mt-4 flex flex-wrap gap-2">
          {found.children.map((c) => (
            <Link key={c.id} href={`/kateqoriya/${c.slug}`} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-fg">
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}
      <ListingsBrowser basePath={`/kateqoriya/${slug}`} filters={filters} heading={found.category.name} lockCategory />
    </>
  )
}
