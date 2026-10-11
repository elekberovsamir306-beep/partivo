import Link from 'next/link'
import { Suspense } from 'react'
import { HeaderSearch } from '@/components/layout/header-search'
import { HeroVisual } from '@/components/home/hero-visual'
import { ListingGrid } from '@/components/listings/listing-card'
import { RecentlyViewed } from '@/components/listings/recently-viewed'
import { Reveal } from '@/components/ui/reveal'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowRightIcon,
  CategoryIcon,
  ChatIcon,
  PackageIcon,
  RocketIcon,
  SearchIcon,
  ShieldCheckIcon,
  StoreIcon,
  UploadIcon,
} from '@/components/icons'
import { getCategoryTree, getHomepageSettings, getMakes } from '@/lib/data/catalog'
import { getHomeSections, getTrustedBusinesses } from '@/lib/data/listings'
import { getMyFavoriteIds } from '@/lib/data/favorites'
import { avatarUrl } from '@/lib/storage'
import { formatNumber } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'

async function activeListingCount() {
  if (!isSupabaseConfigured()) return 0
  const supabase = await createClient()
  const { count } = await supabase.from('listing_cards').select('id', { count: 'exact', head: true }).eq('is_public', true)
  return count ?? 0
}

function SectionHeading({ id, title, subtitle, href, label }: { id: string; title: string; subtitle?: string; href?: string; label?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-2xl font-extrabold sm:text-3xl">
          {title}
        </h2>
        {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent-text">
          {label ?? 'Hamısına bax'}
          <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  )
}

export default async function HomePage() {
  const [settings, sections, categories, makes, businesses, favoriteIds, total] = await Promise.all([
    getHomepageSettings(),
    getHomeSections(),
    getCategoryTree(),
    getMakes(),
    getTrustedBusinesses(),
    getMyFavoriteIds(),
    activeListingCount(),
  ])
  const show = settings.sections
  const popularMakes = makes.filter((m) => m.is_popular).slice(0, 12)

  return (
    <>
      {/* Hero ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-noise pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_107_26/0.16),transparent)]"
          aria-hidden="true"
        />
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              {total > 0 ? `${formatNumber(total)} aktiv elan` : 'Azərbaycanın ehtiyat hissələri bazarı'}
            </p>
            <h1 className="text-4xl leading-[1.04] font-extrabold sm:text-5xl lg:text-6xl">
              Lazım olan hissəni <span className="text-metal">dəqiq</span> tapın.
              <br className="hidden sm:block" /> <span className="text-accent">Artıq olanı</span> satın.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              OEM kodu, marka, model və ilə görə axtarış. Satıcı ilə birbaşa zəng və ya WhatsApp — vasitəçisiz.
            </p>
            <div className="mt-8 max-w-2xl">
              <Suspense fallback={<div className="h-16 rounded-2xl border border-line bg-elevated" />}>
                <HeaderSearch large />
              </Suspense>
            </div>
            {settings.popular_searches.length ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-subtle">Populyar:</span>
                {settings.popular_searches.slice(0, 8).map((q) => (
                  <Link
                    key={q}
                    href={`/elanlar?q=${encodeURIComponent(q)}`}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-fg"
                  >
                    {q}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Popular makes ------------------------------------------------------- */}
      {show.makes && popularMakes.length ? (
        <section aria-labelledby="makes-heading" className="container-page mt-16">
          <Reveal>
            <SectionHeading id="makes-heading" title="Populyar markalar" href="/elanlar" label="Bütün elanlar" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {popularMakes.map((make) => (
                <Link
                  key={make.id}
                  href={`/elanlar?make=${make.slug}`}
                  className="group flex h-16 items-center justify-center rounded-xl border border-line bg-surface px-3 text-center text-sm font-bold text-silver transition-all hover:-translate-y-0.5 hover:border-line-strong hover:text-fg"
                >
                  {make.name}
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* Categories --------------------------------------------------------- */}
      {show.categories && categories.length ? (
        <section aria-labelledby="categories-heading" className="container-page mt-16">
          <Reveal>
            <SectionHeading id="categories-heading" title="Kateqoriyalar" subtitle="Hissənin növünə görə seçin" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/kateqoriya/${c.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-float"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-silver transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                    <CategoryIcon icon={c.icon} size={22} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-fg">{c.name}</span>
                    <span className="block truncate text-xs text-subtle">{c.children.slice(0, 3).map((x) => x.name).join(', ')}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* Paid placements ---------------------------------------------------- */}
      {show.premium && sections.premium.length ? (
        <section aria-labelledby="premium-heading" className="container-page mt-20">
          <SectionHeading
            id="premium-heading"
            title="PREMIUM elanlar"
            subtitle="Ödənişli reklam yerləşdirmələri"
            href="/elanlar?promoted=1"
          />
          <ListingGrid cards={sections.premium.slice(0, 4)} favoriteIds={favoriteIds} />
        </section>
      ) : null}

      {show.vip && sections.vip.length ? (
        <section aria-labelledby="vip-heading" className="container-page mt-20">
          <SectionHeading id="vip-heading" title="VIP elanlar" subtitle="Ödənişli reklam yerləşdirmələri" href="/elanlar?promoted=1" />
          <ListingGrid cards={sections.vip.slice(0, 8)} favoriteIds={favoriteIds} />
        </section>
      ) : null}

      {/* Recent ------------------------------------------------------------- */}
      {show.recent ? (
        <section aria-labelledby="recent-listings-heading" className="container-page mt-20">
          <SectionHeading id="recent-listings-heading" title="Yeni elanlar" href="/elanlar?sort=newest" />
          {sections.recent.length ? (
            <ListingGrid cards={sections.recent} favoriteIds={favoriteIds} />
          ) : (
            <EmptyState
              icon={<PackageIcon size={26} />}
              title="Hələ dərc olunmuş elan yoxdur"
              description="Partivo yeni açılıb. İlk elanı siz yerləşdirin: ilk satıcılar ən çox diqqəti alır."
              action={<ButtonLink href="/elan-yerlesdir">Pulsuz elan yerləşdir</ButtonLink>}
            />
          )}
        </section>
      ) : null}

      <RecentlyViewed />

      {/* Trusted businesses ------------------------------------------------- */}
      {show.business && businesses.length ? (
        <section aria-labelledby="business-heading" className="container-page mt-20">
          <SectionHeading id="business-heading" title="Təsdiqlənmiş mağazalar" subtitle="Komandamız tərəfindən yoxlanılmış biznes satıcılar" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {businesses.map((b) => {
              const img = avatarUrl(b.avatar_path)
              return (
                <Link key={b.id} href={`/satici/${b.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:border-line-strong">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element -- pre-optimised 320px avatar
                    <img src={img} alt="" width={48} height={48} loading="lazy" className="size-12 rounded-xl object-cover" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-xl bg-surface-2 text-silver">
                      <StoreIcon size={22} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 truncate text-sm font-bold">
                      {b.business_name ?? b.display_name}
                      <ShieldCheckIcon size={15} className="shrink-0 text-success" aria-label="Təsdiqlənmiş" />
                    </span>
                    <span className="text-xs text-subtle">{b.activeListings} aktiv elan</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* How it works ------------------------------------------------------- */}
      <section aria-labelledby="how-heading" className="container-page mt-24">
        <Reveal>
          <h2 id="how-heading" className="text-center text-2xl font-extrabold sm:text-3xl">
            Partivo necə işləyir
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Alıcılar üçün',
                steps: [
                  { icon: SearchIcon, text: 'Hissənin adını, OEM kodunu və ya avtomobilinizi yazın.' },
                  { icon: ShieldCheckIcon, text: 'Vəziyyəti, uyğunluğu və satıcının profilini yoxlayın.' },
                  { icon: ChatIcon, text: 'Satıcıya zəng edin və ya WhatsApp-da yazın. Ödənişi hissəni yoxladıqdan sonra edin.' },
                ],
              },
              {
                title: 'Satıcılar üçün',
                steps: [
                  { icon: UploadIcon, text: 'Pulsuz elan yerləşdirin: başlıq, qiymət və 5–10 şəkil.' },
                  { icon: ShieldCheckIcon, text: 'Elan qısa moderasiyadan sonra dərc olunur.' },
                  { icon: RocketIcon, text: 'Daha tez satmaq üçün TOP, VIP və ya PREMIUM ilə önə çıxın.' },
                ],
              },
            ].map((col) => (
              <div key={col.title} className="card p-6 sm:p-8">
                <h3 className="text-lg font-bold">{col.title}</h3>
                <ol className="mt-6 space-y-5">
                  {col.steps.map((s, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
                        <s.icon size={19} />
                      </span>
                      <p className="pt-2 text-sm leading-relaxed text-muted">
                        <span className="mr-1.5 font-bold text-fg">{i + 1}.</span>
                        {s.text}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Seller acquisition ------------------------------------------------- */}
      <section className="container-page mt-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-[radial-gradient(closest-side,rgb(255_107_26/0.25),transparent)]" aria-hidden="true" />
            <div className="relative max-w-2xl">
              <h2 className="text-3xl font-extrabold sm:text-4xl">Qarajınızdakı hissələr pula çevrilsin.</h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Elan yerləşdirmək pulsuzdur. Mağazanız varsa, biznes profili yaradın və &quot;Təsdiqlənmiş satıcı&quot; nişanı üçün müraciət edin.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/elan-yerlesdir" size="lg">
                  Elan yerləşdir
                </ButtonLink>
                <ButtonLink href="/reklam" size="lg" variant="outline">
                  Reklam xidmətləri
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Useful category links (SEO + navigation) ---------------------------- */}
      {categories.length ? (
        <section aria-labelledby="links-heading" className="container-page mt-20">
          <h2 id="links-heading" className="mb-5 text-lg font-bold">
            Faydalı keçidlər
          </h2>
          <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {categories.flatMap((c) => c.children.slice(0, 2)).map((c) => (
              <Link key={c.id} href={`/kateqoriya/${c.slug}`} className="text-muted transition-colors hover:text-fg">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
