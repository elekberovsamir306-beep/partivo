import type { Metadata } from 'next'
import { getSessionUser, getViewer } from '@/lib/auth'
import { ContactForm } from './contact-form'

export const metadata: Metadata = {
  title: 'Əlaqə',
  description: 'Partivo dəstək komandası ilə əlaqə: sual, şikayət, ödəniş və biznes əməkdaşlıq.',
  alternates: { canonical: '/elaqe' },
}

export default async function ContactPage() {
  const [user, viewer] = await Promise.all([getSessionUser(), getViewer()])
  return (
    <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Bizimlə əlaqə</h1>
        <p className="mt-4 max-w-md leading-relaxed text-muted">
          Hesab, elan, ödəniş və ya biznes əməkdaşlıq barədə sualınız varsa, formanı doldurun. Komandamız e-poçtla cavab verəcək.
        </p>
        <ul className="mt-8 space-y-4 text-sm text-muted">
          <li><span className="font-semibold text-fg">Şikayətlər:</span> şübhəli elanı birbaşa elan səhifəsindəki “Şikayət et” düyməsi ilə bildirin — bu, ən sürətli yoldur.</li>
          <li><span className="font-semibold text-fg">Təsdiqlənmiş satıcı:</span> “Biznes əməkdaşlıq” mövzusunu seçin və şirkətiniz barədə qısa məlumat yazın.</li>
        </ul>
      </div>
      <div className="card p-6 sm:p-8">
        <ContactForm defaults={{ name: viewer?.profile?.display_name ?? '', email: user?.email ?? '' }} />
      </div>
    </div>
  )
}
