import type { Metadata } from 'next'
import { ListingWizard } from '@/components/listings/listing-wizard'
import { Alert } from '@/components/ui/alert'
import { getViewer, requireUser } from '@/lib/auth'
import { getWizardDefaults, getWizardOptions, getWizardSettings } from '@/lib/data/wizard'

export const metadata: Metadata = {
  title: 'Elan yerləşdir',
  description: 'Avtomobil ehtiyat hissəsini pulsuz satışa çıxarın.',
  robots: { index: false },
}

export default async function CreateListingPage() {
  const user = await requireUser('/elan-yerlesdir')
  const [viewer, options, defaults, settings] = await Promise.all([
    getViewer(),
    getWizardOptions(),
    getWizardDefaults(user.id),
    getWizardSettings(),
  ])

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Elan yerləşdir</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Pulsuzdur. Məlumatlar hər addımda qaralama kimi saxlanılır, istənilən vaxt davam edə bilərsiniz.
        </p>
      </div>
      {viewer?.profile?.is_suspended ? (
        <Alert tone="danger" title="Hesabınız dayandırılıb">
          Yeni elan yerləşdirə bilməzsiniz. Ətraflı məlumat üçün dəstəklə əlaqə saxlayın.
        </Alert>
      ) : (
        <ListingWizard listingId={null} status={null} initial={defaults} images={[]} options={options} settings={settings} />
      )}
    </div>
  )
}
