import { requirePermission } from '@/lib/auth'
import { getHomepageSettings, getListingSettings } from '@/lib/data/catalog'
import { saveHomepageSettingsAction, saveListingSettingsAction } from '../actions'
import { AdminHeader, Flash } from '../ui'

const SECTION_LABELS: Record<string, string> = {
  premium: 'PREMIUM elanlar',
  vip: 'VIP elanlar',
  recent: 'Yeni elanlar',
  categories: 'Kateqoriyalar',
  makes: 'Populyar markalar',
  business: 'Təsdiqlənmiş mağazalar',
}

export default async function SettingsPage({ searchParams }: PageProps<'/admin/parametrler'>) {
  await requirePermission('settings.manage')
  const params = await searchParams
  const [listing, home] = await Promise.all([getListingSettings(), getHomepageSettings()])
  const num = (name: keyof typeof listing, label: string, hint: string) => (
    <label className="text-sm">
      {label}
      <input name={name} type="number" defaultValue={Number(listing[name])} className="field mt-1" />
      <span className="mt-1 block text-xs text-subtle">{hint}</span>
    </label>
  )

  return (
    <div className="space-y-8">
      <AdminHeader title="Parametrlər" />
      <Flash params={params} />
      <form action={saveListingSettingsAction} className="card grid gap-5 p-6 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">Elan qaydaları</h2>
        {num('duration_days', 'Elanın müddəti, gün', 'Dərcdən sonra elan neçə gün aktiv qalır')}
        {num('renewal_window_days', 'Yeniləmə pəncərəsi, gün', 'Bitməyə neçə gün qalmış yeniləmək olar')}
        {num('max_active_per_user', 'Bir istifadəçi üçün maksimum aktiv elan', 'Aktiv + moderasiyada olanlar')}
        {num('min_photos', 'Minimum şəkil', 'Dərc üçün tələb olunur')}
        {num('max_photos', 'Maksimum şəkil', '')}
        <label className="flex items-center gap-2 self-center text-sm">
          <input type="checkbox" name="require_moderation" defaultChecked={listing.require_moderation} className="size-4.5 accent-[var(--accent)]" />
          Elanlar dərcdən əvvəl moderasiyadan keçsin
        </label>
        <div className="sm:col-span-2"><button className="h-10 rounded-xl bg-accent px-5 text-sm font-bold text-accent-ink">Yadda saxla</button></div>
      </form>

      <form action={saveHomepageSettingsAction} className="card grid gap-5 p-6">
        <h2 className="text-lg font-bold">Ana səhifə</h2>
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-medium">Göstərilən bölmələr</legend>
          {Object.entries(SECTION_LABELS).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`section_${k}`} defaultChecked={home.sections[k as keyof typeof home.sections]} className="accent-[var(--accent)]" />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="text-sm">
          Populyar axtarışlar (hər sətirdə bir)
          <textarea name="popular_searches" defaultValue={home.popular_searches.join('\n')} className="field mt-1 min-h-40" />
        </label>
        <div><button className="h-10 rounded-xl bg-accent px-5 text-sm font-bold text-accent-ink">Yadda saxla</button></div>
      </form>
    </div>
  )
}
