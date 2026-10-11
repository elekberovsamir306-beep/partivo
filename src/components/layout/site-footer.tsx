import Link from 'next/link'
import { Logo } from '@/components/logo'
import { t } from '@/i18n'

const COLUMNS = [
  {
    title: t.footer.marketplace,
    links: [
      { href: '/elanlar', label: 'Bütün elanlar' },
      { href: '/elan-yerlesdir', label: t.nav.postListing },
      { href: '/reklam', label: t.nav.pricing },
      { href: '/secilmisler', label: t.nav.favorites },
    ],
  },
  {
    title: t.footer.support,
    links: [
      { href: '/yardim', label: t.footer.faq },
      { href: '/elaqe', label: t.nav.contact },
      { href: '/elan-qaydalari', label: t.footer.rules },
      { href: '/haqqimizda', label: t.nav.about },
    ],
  },
  {
    title: t.footer.legal,
    links: [
      { href: '/istifade-sertleri', label: t.footer.terms },
      { href: '/mexfilik-siyaseti', label: t.footer.privacyPolicy },
      { href: '/cookie-siyaseti', label: t.footer.cookies },
      { href: '/odenis-ve-geri-qaytarma', label: t.footer.refunds },
    ],
  },
]

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-24 border-t border-line bg-elevated">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed text-muted">{t.brand.description}</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-4 text-xs font-bold tracking-[0.14em] text-subtle uppercase">{col.title}</h2>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Partivo. {t.footer.rights}
          </p>
          <p>{t.footer.madeIn} · partivo.az</p>
        </div>
      </div>
    </footer>
  )
}
