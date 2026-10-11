import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Category, VehicleMake, VehicleModel } from '@/lib/types'
import { saveCategoryAction, saveMakeAction, saveModelAction } from '../actions'
import { AdminHeader, Flash, smallBtn } from '../ui'

export default async function CatalogPage({ searchParams }: PageProps<'/admin/kataloq'>) {
  await requirePermission('catalog.manage')
  const params = await searchParams
  const supabase = await createClient()
  const [{ data: cats }, { data: makes }, { data: models }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('vehicle_makes').select('*').order('sort_order'),
    supabase.from('vehicle_models').select('id, make_id, slug, name, is_active').order('name'),
  ])
  const categories = (cats ?? []) as Category[]
  const parents = categories.filter((c) => !c.parent_id)
  const allMakes = (makes ?? []) as VehicleMake[]
  const allModels = (models ?? []) as VehicleModel[]

  return (
    <div className="space-y-10">
      <AdminHeader title="Kateqoriya və markalar" description="Slug yalnız kiçik latın hərfləri, rəqəm və tire ola bilər. Deaktiv edilən element axtarışdan və formalardan gizlənir." />
      <Flash params={params} />

      <section>
        <h2 className="mb-3 text-lg font-bold">Kateqoriyalar</h2>
        <div className="card divide-y divide-line">
          {parents.map((p) => (
            <div key={p.id} className="p-4">
              <CategoryRow category={p} parents={parents} />
              <div className="mt-2 space-y-2 pl-6">
                {categories.filter((c) => c.parent_id === p.id).map((c) => <CategoryRow key={c.id} category={c} parents={parents} />)}
              </div>
            </div>
          ))}
        </div>
        <form action={saveCategoryAction} className="card mt-3 flex flex-wrap items-end gap-2 p-4">
          <input name="name" required placeholder="Ad" className="field h-9 min-h-0 w-48 py-1 text-sm" />
          <input name="slug" required pattern="[a-z0-9-]+" placeholder="slug" className="field h-9 min-h-0 w-40 py-1 text-sm" />
          <select name="parent_id" className="field h-9 min-h-0 w-48 py-1 text-sm">
            <option value="">— Əsas kateqoriya —</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input name="sort_order" type="number" defaultValue={100} className="field h-9 min-h-0 w-20 py-1 text-sm" />
          <input type="hidden" name="is_active" value="on" />
          <button className={smallBtn}>Əlavə et</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Markalar və modellər</h2>
        <div className="card divide-y divide-line">
          {allMakes.map((m) => (
            <details key={m.id} className="p-4">
              <summary className="cursor-pointer font-semibold">
                {m.name} <span className="text-xs font-normal text-subtle">{m.is_popular ? '· populyar' : ''} {m.is_active ? '' : '· deaktiv'} · {allModels.filter((x) => x.make_id === m.id).length} model</span>
              </summary>
              <form action={saveMakeAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <input name="name" defaultValue={m.name} className="field h-9 min-h-0 w-48 py-1 text-sm" />
                <input name="slug" defaultValue={m.slug} className="field h-9 min-h-0 w-40 py-1 text-sm" />
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="is_popular" defaultChecked={m.is_popular} />Populyar</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="is_active" defaultChecked={m.is_active} />Aktiv</label>
                <button className={smallBtn}>Yadda saxla</button>
              </form>
              <p className="mt-3 text-sm text-muted">{allModels.filter((x) => x.make_id === m.id).map((x) => x.name).join(', ') || 'Model yoxdur'}</p>
              <form action={saveModelAction} className="mt-2 flex flex-wrap gap-2">
                <input type="hidden" name="make_id" value={m.id} />
                <input name="name" required placeholder="Yeni model" className="field h-9 min-h-0 w-44 py-1 text-sm" />
                <input name="slug" required pattern="[a-z0-9-]+" placeholder="slug" className="field h-9 min-h-0 w-36 py-1 text-sm" />
                <button className={smallBtn}>Model əlavə et</button>
              </form>
            </details>
          ))}
        </div>
        <form action={saveMakeAction} className="card mt-3 flex flex-wrap items-center gap-2 p-4">
          <input name="name" required placeholder="Yeni marka" className="field h-9 min-h-0 w-48 py-1 text-sm" />
          <input name="slug" required pattern="[a-z0-9-]+" placeholder="slug" className="field h-9 min-h-0 w-40 py-1 text-sm" />
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="is_popular" />Populyar</label>
          <input type="hidden" name="is_active" value="on" />
          <button className={smallBtn}>Əlavə et</button>
        </form>
      </section>
    </div>
  )
}

function CategoryRow({ category, parents }: { category: Category; parents: Category[] }) {
  return (
    <form action={saveCategoryAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={category.id} />
      <input name="name" defaultValue={category.name} className="field h-9 min-h-0 w-56 py-1 text-sm font-semibold" />
      <input name="slug" defaultValue={category.slug} className="field h-9 min-h-0 w-48 py-1 text-sm" />
      <select name="parent_id" defaultValue={category.parent_id ?? ''} className="field h-9 min-h-0 w-44 py-1 text-sm">
        <option value="">— Əsas —</option>
        {parents.filter((p) => p.id !== category.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input name="sort_order" type="number" defaultValue={category.sort_order} className="field h-9 min-h-0 w-20 py-1 text-sm" />
      <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="is_active" defaultChecked={category.is_active} />Aktiv</label>
      <button className={smallBtn}>Yadda saxla</button>
    </form>
  )
}
