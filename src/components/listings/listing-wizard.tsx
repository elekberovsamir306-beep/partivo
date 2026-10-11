'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { CheckIcon, ImageIcon } from '@/components/icons'
import { ImageManager, type ManagedImage } from '@/components/listings/image-manager'
import { publishListingAction, saveDraftAction, updateListingAction } from '@/app/hesab/elanlar/actions'
import { listingPublishSchema, fieldErrors, CONDITIONS, ENGINE_TYPES, ORIGINALITY, CONTACT_METHODS } from '@/lib/validation/listing'
import { formatPrice } from '@/lib/format'
import { t } from '@/i18n'

export interface WizardValues {
  title: string
  description: string
  price: string
  is_negotiable: boolean
  category_id: string
  condition: string
  city_slug: string
  make_id: string
  model_id: string
  year_from: string
  year_to: string
  engine_type: string
  engine_volume: string
  oem_code: string
  manufacturer: string
  originality: string
  compatibility_notes: string
  delivery_available: boolean
  pickup_available: boolean
  delivery_notes: string
  warranty_months: string
  warranty_notes: string
  contact_method: 'phone' | 'whatsapp' | 'both'
  contact_phone: string
}

export interface WizardOptions {
  categories: { id: number; name: string; parent_id: number | null }[]
  makes: { id: number; name: string }[]
  models: { id: number; make_id: number; name: string }[]
  cities: { slug: string; name: string; region: string }[]
}

const STEPS = [
  { key: 'basics', label: 'Əsas məlumat', fields: ['title', 'category_id', 'condition', 'price'] },
  { key: 'vehicle', label: 'Uyğunluq', fields: ['make_id', 'model_id', 'year_from', 'year_to', 'engine_type', 'engine_volume', 'oem_code', 'manufacturer', 'originality', 'compatibility_notes'] },
  { key: 'photos', label: 'Şəkillər', fields: [] },
  { key: 'details', label: 'Təsvir', fields: ['description', 'delivery_notes', 'pickup_available', 'warranty_months', 'warranty_notes'] },
  { key: 'contact', label: 'Əlaqə', fields: ['city_slug', 'contact_phone', 'contact_method'] },
  { key: 'preview', label: 'Önizləmə', fields: [] },
] as const

const YEARS = Array.from({ length: new Date().getFullYear() + 2 - 1960 }, (_, i) => new Date().getFullYear() + 1 - i)

export function ListingWizard({
  listingId: initialId,
  status,
  initial,
  images: initialImages,
  options,
  settings,
}: {
  listingId: string | null
  status: string | null
  initial: WizardValues
  images: ManagedImage[]
  options: WizardOptions
  settings: { min_photos: number; max_photos: number; require_moderation: boolean }
}) {
  const [values, setValues] = useState(initial)
  const [listingId, setListingId] = useState(initialId)
  const [step, setStep] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  // Bring the new step into view (long steps otherwise leave the user mid-page).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const top = rootRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) window.scrollBy({ top: top - 96, behavior: 'smooth' })
  }, [step])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ tone: 'danger' | 'success' | 'info'; text: string } | null>(null)
  const [photoCount, setPhotoCount] = useState(initialImages.length)
  const [published, setPublished] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const isDraft = !status || status === 'draft' || status === 'rejected'
  const set = <K extends keyof WizardValues>(key: K, value: WizardValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => {
      if (!e[key]) return e
      const next = { ...e }
      delete next[key]
      return next
    })
  }

  const parents = options.categories.filter((c) => c.parent_id === null)
  const selected = options.categories.find((c) => String(c.id) === values.category_id)
  const parentId = selected ? (selected.parent_id ?? selected.id) : null
  const children = parentId ? options.categories.filter((c) => c.parent_id === parentId) : []
  const models = values.make_id ? options.models.filter((m) => String(m.make_id) === values.make_id) : []

  function validate(stepIndex: number | 'all'): Record<string, string> {
    const parsed = listingPublishSchema.safeParse(values)
    const all = parsed.success ? {} : fieldErrors(parsed.error)
    if (children.length && selected && selected.parent_id === null) all.category_id = 'Alt kateqoriyanı seçin'
    if (stepIndex === 'all') return all
    const fields: readonly string[] = STEPS[stepIndex].fields
    return Object.fromEntries(Object.entries(all).filter(([k]) => fields.includes(k)))
  }

  function saveDraft(next?: number) {
    startTransition(async () => {
      setMessage(null)
      const result = await saveDraftAction(listingId, values)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        setMessage({ tone: 'danger', text: result.message ?? t.errors.generic })
        return
      }
      // Keep the URL unchanged: rewriting it to the edit route makes the App Router remount the
      // wizard and reset it to step 1. The saved draft remains reachable from "Elanlarım".
      if (!listingId && result.id) setListingId(result.id)
      if (next !== undefined) setStep(next)
      else setMessage({ tone: 'success', text: 'Qaralama yadda saxlanıldı.' })
    })
  }

  function goTo(target: number) {
    if (target <= step) {
      setStep(target)
      return
    }
    // Validate every step being skipped over.
    for (let i = step; i < target; i++) {
      const stepErrors = i === 2 ? {} : validate(i)
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors)
        setStep(i)
        setMessage({ tone: 'danger', text: 'Davam etmək üçün qeyd olunan sahələri düzəldin.' })
        return
      }
    }
    setErrors({})
    setMessage(null)
    // Photos need a saved listing to attach to; drafts are autosaved on every step.
    if (isDraft || !listingId) saveDraft(target)
    else setStep(target)
  }

  function submit() {
    const all = validate('all')
    if (Object.keys(all).length) {
      setErrors(all)
      const firstStep = STEPS.findIndex((s) => (s.fields as readonly string[]).some((f) => all[f]))
      if (firstStep >= 0) setStep(firstStep)
      setMessage({ tone: 'danger', text: 'Bəzi mütləq sahələr doldurulmayıb.' })
      return
    }
    if (photoCount < settings.min_photos) {
      setStep(2)
      setMessage({ tone: 'danger', text: `Dərc etmək üçün ən azı ${settings.min_photos} şəkil yükləyin.` })
      return
    }
    if (!listingId) return
    startTransition(async () => {
      const result = isDraft ? await publishListingAction(listingId, values) : await updateListingAction(listingId, values)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        setMessage({ tone: 'danger', text: result.message ?? t.errors.generic })
        return
      }
      setPublished(result.status ?? 'saved')
    })
  }

  if (published) {
    const pendingReview = published === 'pending'
    return (
      <div className="card p-8 text-center sm:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success">
          <CheckIcon size={30} />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold">
          {pendingReview ? 'Elan moderasiyaya göndərildi' : isDraft ? 'Elan dərc olundu!' : 'Dəyişikliklər yadda saxlanıldı'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {pendingReview
            ? 'Moderatorlarımız elanı yoxladıqdan sonra dərc olunacaq. Nəticə barədə bildiriş alacaqsınız.'
            : 'Elanınız alıcılara görünür. Daha tez satmaq üçün onu irəli çəkə bilərsiniz.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/hesab/elanlar" variant="secondary">Elanlarım</ButtonLink>
          {published === 'active' && listingId ? <ButtonLink href={`/hesab/elanlar/${listingId}/irelilet`}>İrəli çək</ButtonLink> : null}
        </div>
      </div>
    )
  }

  const current = STEPS[step]
  const categoryName = (id: string) => options.categories.find((c) => String(c.id) === id)?.name

  return (
    <div ref={rootRef} className="grid gap-6 lg:grid-cols-[15rem_1fr]">
      <nav aria-label="Addımlar" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1">
          {STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            return (
              <li key={s.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={pending}
                  aria-current={active ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    active ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2/60 hover:text-fg'
                  }`}
                >
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${active ? 'bg-accent text-accent-ink' : done ? 'bg-success-soft text-success' : 'bg-surface-3 text-muted'}`}>
                    {done ? <CheckIcon size={14} /> : i + 1}
                  </span>
                  {s.label}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="card p-5 sm:p-8">
        <h2 className="text-xl font-extrabold">{current.label}</h2>
        {message ? (
          <div className="mt-4">
            <Alert tone={message.tone}>{message.text}</Alert>
          </div>
        ) : null}

        <div className="mt-6 space-y-5">
          {current.key === 'basics' ? (
            <>
              <Field label="Başlıq" error={errors.title} hint="Məsələn: Toyota Camry 70 ön sol fara, original">
                {(p) => <Input {...p} value={values.title} onChange={(e) => set('title', e.target.value)} maxLength={90} required />}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Kateqoriya" error={!children.length ? errors.category_id : undefined}>
                  {(p) => (
                    <Select {...p} value={parentId ? String(parentId) : ''} onChange={(e) => set('category_id', e.target.value)} required>
                      <option value="">Seçin</option>
                      {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Alt kateqoriya" error={children.length ? errors.category_id : undefined}>
                  {(p) => (
                    <Select {...p} value={selected && selected.parent_id ? values.category_id : ''} disabled={!children.length} onChange={(e) => set('category_id', e.target.value || String(parentId ?? ''))}>
                      <option value="">Seçin</option>
                      {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  )}
                </Field>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Vəziyyət</legend>
                <div className="grid grid-cols-3 gap-2">
                  {CONDITIONS.map((c) => (
                    <label key={c} className="flex cursor-pointer items-center justify-center rounded-xl border border-line px-3 py-3 text-sm font-semibold transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
                      <input type="radio" name="condition" value={c} checked={values.condition === c} onChange={() => set('condition', c)} className="sr-only" />
                      {t.conditions[c]}
                    </label>
                  ))}
                </div>
                {errors.condition ? <p className="mt-1.5 text-xs font-medium text-danger">{errors.condition}</p> : null}
              </fieldset>
              <div className="grid items-end gap-5 sm:grid-cols-2">
                <Field label="Qiymət, ₼" error={errors.price}>
                  {(p) => <Input {...p} inputMode="decimal" value={values.price} onChange={(e) => set('price', e.target.value)} placeholder="0" />}
                </Field>
                <label className="flex h-11 items-center gap-3 text-sm">
                  <input type="checkbox" checked={values.is_negotiable} onChange={(e) => set('is_negotiable', e.target.checked)} className="size-4.5 accent-[var(--accent)]" />
                  Qiymətdə razılaşma mümkündür
                </label>
              </div>
            </>
          ) : null}

          {current.key === 'vehicle' ? (
            <>
              <p className="text-sm text-muted">Bu məlumatlar istəyə bağlıdır, lakin alıcıların sizi tapmasını xeyli asanlaşdırır.</p>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Marka" optional error={errors.make_id}>
                  {(p) => (
                    <Select {...p} value={values.make_id} onChange={(e) => setValues((v) => ({ ...v, make_id: e.target.value, model_id: '' }))}>
                      <option value="">Seçin</option>
                      {options.makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Model" optional error={errors.model_id}>
                  {(p) => (
                    <Select {...p} value={values.model_id} disabled={!values.make_id} onChange={(e) => set('model_id', e.target.value)}>
                      <option value="">Seçin</option>
                      {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Buraxılış ili (başlanğıc)" optional error={errors.year_from}>
                  {(p) => (
                    <Select {...p} value={values.year_from} onChange={(e) => set('year_from', e.target.value)}>
                      <option value="">—</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Buraxılış ili (son)" optional error={errors.year_to}>
                  {(p) => (
                    <Select {...p} value={values.year_to} onChange={(e) => set('year_to', e.target.value)}>
                      <option value="">—</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Mühərrik tipi" optional error={errors.engine_type}>
                  {(p) => (
                    <Select {...p} value={values.engine_type} onChange={(e) => set('engine_type', e.target.value)}>
                      <option value="">—</option>
                      {ENGINE_TYPES.map((e) => <option key={e} value={e}>{t.engineTypes[e]}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Mühərrik həcmi, l" optional error={errors.engine_volume}>
                  {(p) => <Input {...p} inputMode="decimal" value={values.engine_volume} onChange={(e) => set('engine_volume', e.target.value)} placeholder="məs. 2.5" />}
                </Field>
                <Field label="OEM / hissə nömrəsi" optional error={errors.oem_code} hint="Hissənin üzərində və ya etiketində yazılır">
                  {(p) => <Input {...p} className="font-mono uppercase" value={values.oem_code} onChange={(e) => set('oem_code', e.target.value)} maxLength={60} />}
                </Field>
                <Field label="İstehsalçı / brend" optional error={errors.manufacturer}>
                  {(p) => <Input {...p} value={values.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} placeholder="məs. Bosch, Denso, Toyota" maxLength={60} />}
                </Field>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Original və ya analoq <span className="font-normal text-subtle">(istəyə bağlı)</span></legend>
                <div className="flex flex-wrap gap-2">
                  {['', ...ORIGINALITY].map((o) => (
                    <label key={o || 'none'} className="cursor-pointer rounded-xl border border-line px-4 py-2.5 text-sm font-medium has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                      <input type="radio" name="originality" className="sr-only" checked={values.originality === o} onChange={() => set('originality', o)} />
                      {o ? t.originality[o] : 'Bilmirəm'}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Uyğunluq haqqında əlavə məlumat" optional error={errors.compatibility_notes}>
                {(p) => <Textarea {...p} value={values.compatibility_notes} onChange={(e) => set('compatibility_notes', e.target.value)} maxLength={1000} placeholder="məs. Camry 2018–2021, 2.5 benzin; Lexus ES 2019 ilə də uyğundur" className="min-h-24" />}
              </Field>
            </>
          ) : null}

          {current.key === 'photos' ? (
            listingId ? (
              <ImageManager listingId={listingId} initial={initialImages} minPhotos={settings.min_photos} maxPhotos={settings.max_photos} onChange={setPhotoCount} />
            ) : (
              <Alert tone="info">Şəkil yükləmək üçün əvvəlcə əsas məlumatları yadda saxlayın.</Alert>
            )
          ) : null}

          {current.key === 'details' ? (
            <>
              <Field label="Təsvir" error={errors.description} hint={`${values.description.length} / 5000 · vəziyyəti, qüsurları və komplektasiyanı dürüst yazın`}>
                {(p) => <Textarea {...p} value={values.description} onChange={(e) => set('description', e.target.value)} maxLength={5000} className="min-h-44" />}
              </Field>
              <fieldset className="space-y-3">
                <legend className="mb-1 text-sm font-medium">Təhvil üsulu</legend>
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={values.pickup_available} onChange={(e) => set('pickup_available', e.target.checked)} className="size-4.5 accent-[var(--accent)]" />
                  Yerindən götürmə
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={values.delivery_available} onChange={(e) => set('delivery_available', e.target.checked)} className="size-4.5 accent-[var(--accent)]" />
                  Çatdırılma mümkündür
                </label>
                {errors.pickup_available ? <p className="text-xs font-medium text-danger">{errors.pickup_available}</p> : null}
              </fieldset>
              {values.delivery_available ? (
                <Field label="Çatdırılma şərtləri" optional error={errors.delivery_notes}>
                  {(p) => <Input {...p} value={values.delivery_notes} onChange={(e) => set('delivery_notes', e.target.value)} maxLength={300} placeholder="məs. Bakı daxili 5 ₼, regionlara kargo ilə" />}
                </Field>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
                <Field label="Zəmanət, ay" optional error={errors.warranty_months}>
                  {(p) => <Input {...p} inputMode="numeric" value={values.warranty_months} onChange={(e) => set('warranty_months', e.target.value)} placeholder="0" />}
                </Field>
                <Field label="Zəmanət şərtləri" optional error={errors.warranty_notes}>
                  {(p) => <Input {...p} value={values.warranty_notes} onChange={(e) => set('warranty_notes', e.target.value)} maxLength={300} placeholder="məs. Quraşdırmadan sonra 14 gün yoxlama" />}
                </Field>
              </div>
            </>
          ) : null}

          {current.key === 'contact' ? (
            <>
              <Field label="Şəhər / rayon" error={errors.city_slug}>
                {(p) => (
                  <Select {...p} value={values.city_slug} onChange={(e) => set('city_slug', e.target.value)}>
                    <option value="">Seçin</option>
                    {[...new Set(options.cities.map((c) => c.region))].map((region) => (
                      <optgroup key={region} label={region}>
                        {options.cities.filter((c) => c.region === region).map((c) => (
                          <option key={c.slug} value={c.slug}>{c.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Əlaqə nömrəsi" error={errors.contact_phone} hint="Nömrə səhifədə gizli saxlanılır və yalnız alıcı “Nömrəni göstər” düyməsini sıxdıqda görünür.">
                {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" value={values.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="050 123 45 67" />}
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Alıcılar sizinlə necə əlaqə saxlasın?</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {CONTACT_METHODS.map((m) => (
                    <label key={m} className="flex cursor-pointer items-center justify-center rounded-xl border border-line px-3 py-3 text-sm font-semibold has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                      <input type="radio" name="contact_method" className="sr-only" checked={values.contact_method === m} onChange={() => set('contact_method', m)} />
                      {t.contactMethods[m]}
                    </label>
                  ))}
                </div>
                {errors.contact_method ? <p className="mt-1.5 text-xs font-medium text-danger">{errors.contact_method}</p> : null}
              </fieldset>
              <p className="text-xs leading-relaxed text-subtle">
                Bu nömrəni elanda göstərməyə razılıq verirsiniz. Ətraflı: <Link href="/mexfilik-siyaseti" className="underline">məxfilik siyasəti</Link>.
              </p>
            </>
          ) : null}

          {current.key === 'preview' ? (
            <div className="space-y-5">
              <div className="flex gap-4 rounded-2xl border border-line bg-surface-2/50 p-4">
                <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-3 text-subtle">
                  <ImageIcon size={26} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-2xl font-extrabold">{values.price ? formatPrice(values.price) : '—'}</p>
                  <p className="mt-1 font-semibold">{values.title || 'Başlıq yoxdur'}</p>
                  <p className="mt-1 text-sm text-muted">
                    {[categoryName(values.category_id), values.condition ? t.conditions[values.condition] : null, options.cities.find((c) => c.slug === values.city_slug)?.name].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-3"><dt className="text-muted">Şəkillər</dt><dd className={photoCount >= settings.min_photos ? 'font-semibold text-success' : 'font-semibold text-danger'}>{photoCount}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Marka / model</dt><dd className="font-medium">{[options.makes.find((m) => String(m.id) === values.make_id)?.name, models.find((m) => String(m.id) === values.model_id)?.name].filter(Boolean).join(' ') || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">OEM</dt><dd className="font-mono">{values.oem_code || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Əlaqə</dt><dd className="font-medium">{t.contactMethods[values.contact_method]}</dd></div>
              </dl>
              {values.description ? <p className="rounded-xl bg-surface-2/50 p-4 text-sm leading-relaxed whitespace-pre-line text-muted">{values.description}</p> : null}
              {isDraft && settings.require_moderation ? (
                <Alert tone="info">Elan dərc olunmazdan əvvəl moderasiyadan keçəcək. Dərc etməklə <Link href="/elan-qaydalari" className="underline">elan qaydalarını</Link> qəbul edirsiniz.</Alert>
              ) : null}
              {!isDraft && status === 'active' && settings.require_moderation ? (
                <Alert tone="warning">Başlıq, təsvir və ya kateqoriyanı dəyişsəniz, elan yenidən moderasiyaya göndəriləcək.</Alert>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
              {t.common.back}
            </Button>
          ) : null}
          {isDraft ? (
            <Button type="button" variant="secondary" onClick={() => saveDraft()} loading={pending && step < STEPS.length - 1}>
              Qaralama kimi saxla
            </Button>
          ) : null}
          <div className="ml-auto">
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => goTo(step + 1)} disabled={pending}>
                {t.common.next}
              </Button>
            ) : (
              <Button type="button" onClick={submit} loading={pending} size="lg">
                {isDraft ? 'Elanı dərc et' : 'Dəyişiklikləri yadda saxla'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
