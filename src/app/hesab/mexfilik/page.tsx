import type { Metadata } from 'next'
import Link from 'next/link'
import { DownloadIcon } from '@/components/icons'
import { requireUser } from '@/lib/auth'
import { DeleteAccountForm } from './delete-form'

export const metadata: Metadata = { title: 'Məxfilik və məlumatlar', robots: { index: false } }

export default async function PrivacySettingsPage() {
  await requireUser('/hesab/mexfilik')
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Məxfilik və məlumatlar</h1>

      <section className="card p-5 sm:p-7">
        <h2 className="text-lg font-bold">Məlumatlarımı yüklə</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Profiliniz, elanlarınız, seçilmişləriniz, sifarişləriniz, ödəniş qeydləriniz və bildirişləriniz JSON faylı kimi yüklənəcək.
        </p>
        <a href="/api/account/export" download className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-5 text-sm font-semibold hover:bg-surface-2">
          <DownloadIcon size={18} /> JSON faylını yüklə
        </a>
      </section>

      <section className="card p-5 sm:p-7">
        <h2 className="text-lg font-bold">Brauzerdə saxlanılan məlumatlar</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Son baxdığınız elanlar və tema seçiminiz yalnız bu cihazda saxlanılır. Onları ana səhifədəki “Tarixçəni təmizlə” düyməsi ilə və ya brauzer ayarlarından silə bilərsiniz.{' '}
          <Link href="/cookie-siyaseti" className="text-accent-text underline-offset-4 hover:underline">Kuki siyasəti</Link>
        </p>
      </section>

      <section className="card border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] p-5 sm:p-7">
        <h2 className="text-lg font-bold text-danger">Hesabı sil</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Hesab, bütün elanlar, şəkillər, seçilmişlər və bildirişlər birdəfəlik silinəcək. Bu əməliyyat geri qaytarıla bilməz. Mühasibat uçotu üçün
          ödəniş qeydləri şəxsiyyətsizləşdirilmiş formada saxlanılır.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  )
}
