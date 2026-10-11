import type { Metadata } from 'next'
import Link from 'next/link'
import { parseFaq } from '@/components/content/rich-text'
import { ChevronDownIcon } from '@/components/icons'
import { ButtonLink } from '@/components/ui/button'
import { loadContentPage } from '@/lib/data/content'

export const metadata: Metadata = {
  title: 'Kömək mərkəzi',
  description: 'Partivo-da elan yerləşdirmə, axtarış, reklam xidmətləri və təhlükəsizlik barədə tez-tez verilən suallar.',
  alternates: { canonical: '/yardim' },
}

export default async function HelpPage() {
  const faq = await loadContentPage('faq')
  const items = faq ? parseFaq(faq.body) : []
  const jsonLd = items.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((i) => ({ '@type': 'Question', name: i.question, acceptedAnswer: { '@type': 'Answer', text: i.answer } })),
      }
    : null

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} /> : null}
      <h1 className="text-3xl font-extrabold sm:text-4xl">Kömək mərkəzi</h1>
      <p className="mt-3 text-muted">Ən çox verilən suallar. Cavab tapmadınızsa, bizə yazın.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { href: '/elan-qaydalari', label: 'Elan qaydaları' },
          { href: '/reklam', label: 'Reklam xidmətləri' },
          { href: '/odenis-ve-geri-qaytarma', label: 'Ödəniş və geri qaytarma' },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="card p-4 text-sm font-semibold transition-colors hover:border-line-strong">
            {l.label}
          </Link>
        ))}
      </div>

      <div className="mt-10 space-y-3">
        {items.map((item) => (
          <details key={item.question} className="group card overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDownIcon size={18} className="shrink-0 text-subtle transition-transform group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed whitespace-pre-line text-muted">{item.answer}</p>
          </details>
        ))}
      </div>

      <div className="card mt-12 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">Sualınızın cavabını tapmadınız?</p>
        <ButtonLink href="/elaqe">Bizə yazın</ButtonLink>
      </div>
    </div>
  )
}
