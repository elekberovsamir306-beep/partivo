import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RichText } from '@/components/content/rich-text'
import { CONTENT_SLUGS, loadContentPage } from '@/lib/data/content'
import { formatDate } from '@/lib/format'

export const dynamicParams = false

export function generateStaticParams() {
  return CONTENT_SLUGS.map((page) => ({ page }))
}

export async function generateMetadata({ params }: PageProps<'/[page]'>): Promise<Metadata> {
  const { page } = await params
  const content = await loadContentPage(page)
  if (!content) return {}
  return {
    title: content.title,
    description: content.body.replace(/^## .*$/gm, '').replace(/\s+/g, ' ').trim().slice(0, 160),
    alternates: { canonical: `/${page}` },
  }
}

export default async function ContentPage({ params }: PageProps<'/[page]'>) {
  const { page } = await params
  const content = await loadContentPage(page)
  if (!content) notFound()
  return (
    <article className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{content.title}</h1>
      {content.updated_at ? <p className="mt-2 text-sm text-subtle">Son yenilənmə: {formatDate(content.updated_at)}</p> : null}
      <div className="mt-8">
        <RichText body={content.body} />
      </div>
    </article>
  )
}
