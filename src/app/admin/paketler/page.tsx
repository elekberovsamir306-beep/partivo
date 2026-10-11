import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { PromotionPackage } from '@/lib/types'
import { t } from '@/i18n'
import { savePackageAction } from '../actions'
import { AdminHeader, Flash } from '../ui'

const PLACEMENTS = ['search_top', 'vip_section', 'homepage', 'highlight'] as const

function PackageForm({ pkg }: { pkg?: PromotionPackage }) {
  return (
    <form action={savePackageAction} className="card grid gap-4 p-5 sm:grid-cols-2">
      {pkg ? <input type="hidden" name="id" value={pkg.id} /> : null}
      <label className="text-sm">Kod<input name="code" defaultValue={pkg?.code} required pattern="[a-z0-9_-]{2,32}" className="field mt-1" readOnly={Boolean(pkg)} /></label>
      <label className="text-sm">Ad<input name="name" defaultValue={pkg?.name} required className="field mt-1" /></label>
      <label className="text-sm">Qiymət, ₼<input name="price" defaultValue={pkg?.price} required inputMode="decimal" className="field mt-1" /></label>
      <label className="text-sm">Müddət, gün<input name="duration_days" type="number" min={1} max={365} defaultValue={pkg?.duration_days ?? 7} required className="field mt-1" /></label>
      <label className="text-sm sm:col-span-2">Təsvir<input name="description" defaultValue={pkg?.description} className="field mt-1" /></label>
      <label className="text-sm sm:col-span-2">Üstünlüklər (hər sətirdə bir)<textarea name="features" defaultValue={pkg?.features.join('\n')} className="field mt-1 min-h-20" /></label>
      <fieldset className="text-sm sm:col-span-2">
        <legend className="mb-1.5">Yerləşdirmə qaydaları</legend>
        <div className="flex flex-wrap gap-3">
          {PLACEMENTS.map((p) => (
            <label key={p} className="flex items-center gap-2"><input type="checkbox" name="placements" value={p} defaultChecked={pkg?.placements.includes(p)} className="accent-[var(--accent)]" />{t.placements[p]}</label>
          ))}
        </div>
      </fieldset>
      <label className="text-sm">Sıra<input name="sort_order" type="number" defaultValue={pkg?.sort_order ?? 100} className="field mt-1" /></label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="is_active" defaultChecked={pkg?.is_active ?? true} className="accent-[var(--accent)]" />Satışda aktivdir</label>
      <div className="sm:col-span-2"><button className="h-10 rounded-xl bg-accent px-5 text-sm font-bold text-accent-ink">{pkg ? 'Yadda saxla' : 'Paket yarat'}</button></div>
    </form>
  )
}

export default async function PackagesPage({ searchParams }: PageProps<'/admin/paketler'>) {
  await requirePermission('packages.manage')
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from('promotion_packages').select('*').order('sort_order')
  const packages = ((data ?? []) as PromotionPackage[]).map((p) => ({ ...p, price: Number(p.price) }))

  return (
    <div className="space-y-6">
      <AdminHeader title="Reklam paketləri" description="Qiymət dəyişikliyi yalnız yeni sifarişlərə təsir edir; ödənilmiş sifarişlər paketin o anki surətini saxlayır." />
      <Flash params={params} />
      {packages.map((p) => (
        <details key={p.id} className="group">
          <summary className="card flex cursor-pointer list-none items-center justify-between p-4 font-semibold">
            <span>{p.name} <span className="text-sm font-normal text-muted">· {formatPrice(p.price)} · {p.duration_days} gün {p.is_active ? '' : '· deaktiv'}</span></span>
            <span className="text-sm text-accent-text">Redaktə</span>
          </summary>
          <div className="mt-2"><PackageForm pkg={p} /></div>
        </details>
      ))}
      <h2 className="pt-4 text-lg font-bold">Yeni paket</h2>
      <PackageForm />
    </div>
  )
}
