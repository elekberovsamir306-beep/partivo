import type { Metadata } from 'next'
import Link from 'next/link'
import { PackageCard } from '@/components/promotions/package-cards'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { CheckIcon, RocketIcon } from '@/components/icons'
import { getActivePackages } from '@/lib/data/packages'
import { t } from '@/i18n'

export const metadata: Metadata = {
  title: 'Reklam xidmətləri: TOP, VIP, PREMIUM',
  description: 'Elanınızı daha çox alıcıya göstərin: TOP, VIP və PREMIUM paketlərinin qiymətləri və müqayisəsi.',
  alternates: { canonical: '/reklam' },
}

const PLACEMENTS = ['search_top', 'highlight', 'vip_section', 'homepage'] as const

export default async function PricingPage() {
  const packages = await getActivePackages()
  const featuredIndex = packages.length >= 3 ? 1 : -1

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Daha tez satın</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Ödənişli xidmətlər elanınızı axtarışda, VIP bölməsində və ana səhifədə önə çıxarır. Reklam elanlarında “TOP”, “VIP” və ya
          “PREMIUM” nişanı ilə açıq şəkildə göstərilir.
        </p>
      </div>

      {packages.length ? (
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {packages.map((pkg, i) => (
            <PackageCard key={pkg.id} pkg={pkg} featured={i === featuredIndex}>
              <ButtonLink href="/hesab/elanlar?status=active" variant={i === featuredIndex ? 'primary' : 'outline'} className="w-full">
                Elan seç
              </ButtonLink>
            </PackageCard>
          ))}
        </div>
      ) : (
        <div className="mt-12">
          <EmptyState icon={<RocketIcon size={26} />} title="Paketlər hazırda mövcud deyil" description="Tezliklə yenidən yoxlayın." />
        </div>
      )}

      {packages.length ? (
        <section aria-labelledby="compare" className="mt-16">
          <h2 id="compare" className="mb-5 text-2xl font-extrabold">Müqayisə</h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-4 text-left font-semibold text-muted">Xidmət</th>
                  {packages.map((p) => (
                    <th key={p.id} className="px-5 py-4 text-center font-extrabold">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PLACEMENTS.map((placement) => (
                  <tr key={placement}>
                    <td className="px-5 py-3.5">{t.placements[placement]}</td>
                    {packages.map((p) => (
                      <td key={p.id} className="px-5 py-3.5 text-center">
                        {p.placements.includes(placement) ? <CheckIcon size={18} className="mx-auto text-success" aria-label="Var" /> : <span className="text-subtle" aria-label="Yoxdur">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="px-5 py-3.5">Müddət</td>
                  {packages.map((p) => <td key={p.id} className="px-5 py-3.5 text-center font-semibold">{p.duration_days} gün</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-16 grid gap-5 md:grid-cols-3">
        {[
          { title: 'Necə alınır?', text: '“Elanlarım” bölməsində aktiv elanın yanında “İrəli çək” düyməsini sıxın, paketi seçin və bankın təhlükəsiz səhifəsində ödəyin.' },
          { title: 'Nə vaxt aktivləşir?', text: 'Xidmət bank ödənişi təsdiqlədikdən dərhal sonra aktivləşir. Ödəniş təsdiqlənməyibsə, xidmət aktivləşmir və vəsait silinmir.' },
          { title: 'Geri qaytarma', text: 'Şərtlər “Ödəniş və geri qaytarma” səhifəsində göstərilib.' },
        ].map((item) => (
          <div key={item.title} className="card p-6">
            <h3 className="font-bold">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
          </div>
        ))}
      </section>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/odenis-ve-geri-qaytarma" className="text-accent-text underline-offset-4 hover:underline">Ödəniş və geri qaytarma qaydaları</Link>
      </p>
    </div>
  )
}
