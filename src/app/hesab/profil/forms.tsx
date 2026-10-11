'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { UserIcon } from '@/components/icons'
import {
  sendPhoneOtpAction,
  updateContactSettingsAction,
  updateProfileAction,
  verifyPhoneOtpAction,
  type ActionState,
} from '../actions'
import { t } from '@/i18n'

const initial: ActionState = {}

export interface ProfileValues {
  display_name: string
  seller_type: 'private' | 'business'
  business_name: string | null
  business_description: string | null
  business_address: string | null
  city_slug: string | null
}

export function ProfileForm({ profile, cities }: { profile: ProfileValues; cities: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial)
  const [sellerType, setSellerType] = useState(profile.seller_type)
  return (
    <form action={action} className="space-y-5">
      {state.message ? <Alert tone={state.ok ? 'success' : 'danger'}>{state.message}</Alert> : null}
      <Field label="Ad" error={state.errors?.display_name}>
        {(p) => <Input {...p} name="display_name" defaultValue={profile.display_name} maxLength={80} required />}
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Satıcı növü</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['private', 'business'] as const).map((s) => (
            <label key={s} className="flex cursor-pointer items-center justify-center rounded-xl border border-line px-3 py-3 text-sm font-semibold has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="radio" name="seller_type" value={s} checked={sellerType === s} onChange={() => setSellerType(s)} className="sr-only" />
              {t.sellerTypes[s]}
            </label>
          ))}
        </div>
      </fieldset>
      {sellerType === 'business' ? (
        <>
          <Field label="Mağaza / şirkət adı" error={state.errors?.business_name}>
            {(p) => <Input {...p} name="business_name" defaultValue={profile.business_name ?? ''} maxLength={120} />}
          </Field>
          <Field label="Mağaza haqqında" optional error={state.errors?.business_description}>
            {(p) => <Textarea {...p} name="business_description" defaultValue={profile.business_description ?? ''} maxLength={1500} />}
          </Field>
          <Field label="Ünvan" optional error={state.errors?.business_address}>
            {(p) => <Input {...p} name="business_address" defaultValue={profile.business_address ?? ''} maxLength={200} />}
          </Field>
          <p className="text-xs leading-relaxed text-subtle">
            “Təsdiqlənmiş satıcı” nişanı üçün “Əlaqə” səhifəsindən “Biznes əməkdaşlıq” mövzusunda müraciət edin. Nişan yalnız
            sənədlər yoxlanıldıqdan sonra komandamız tərəfindən verilir.
          </p>
        </>
      ) : null}
      <Field label="Şəhər" optional>
        {(p) => (
          <Select {...p} name="city_slug" defaultValue={profile.city_slug ?? ''}>
            <option value="">—</option>
            {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </Select>
        )}
      </Field>
      <Button type="submit" loading={pending}>{t.common.save}</Button>
    </form>
  )
}

export function AvatarForm({ avatar }: { avatar: string | null }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const send = (method: 'POST' | 'DELETE', file?: File) =>
    startTransition(async () => {
      setError(null)
      const body = new FormData()
      if (file) body.append('file', file)
      const response = await fetch('/api/account/avatar', { method, body: file ? body : undefined })
      const json = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string }
      if (!json.ok) setError(json.message ?? t.errors.generic)
      router.refresh()
    })

  return (
    <div className="flex items-center gap-4">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- pre-optimised 320px avatar
        <img src={avatar} alt="Profil şəkli" width={72} height={72} className="size-18 rounded-2xl object-cover" />
      ) : (
        <span className="grid size-18 place-items-center rounded-2xl bg-surface-2 text-silver"><UserIcon size={28} /></span>
      )}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" loading={pending} onClick={() => input.current?.click()}>Şəkil yüklə</Button>
          {avatar ? <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => send('DELETE')}>Sil</Button> : null}
        </div>
        <p className="text-xs text-subtle">JPG, PNG və ya WEBP, maksimum 4 MB.</p>
        {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) send('POST', file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

export function ContactSettingsForm({
  values,
}: {
  values: { phone: string | null; default_contact_method: 'phone' | 'whatsapp' | 'both'; email_notifications: boolean }
}) {
  const [state, action, pending] = useActionState(updateContactSettingsAction, initial)
  return (
    <form action={action} className="space-y-5">
      {state.message ? <Alert tone={state.ok ? 'success' : 'danger'}>{state.message}</Alert> : null}
      <Field label="Əsas telefon nömrəsi" optional error={state.errors?.phone} hint="Yeni elanlarda avtomatik doldurulur.">
        {(p) => <Input {...p} name="phone" type="tel" defaultValue={values.phone ?? ''} placeholder="050 123 45 67" />}
      </Field>
      <Field label="Standart əlaqə üsulu">
        {(p) => (
          <Select {...p} name="default_contact_method" defaultValue={values.default_contact_method}>
            {Object.entries(t.contactMethods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        )}
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="email_notifications" defaultChecked={values.email_notifications} className="size-4.5 accent-[var(--accent)]" />
        Vacib bildirişləri e-poçtla da göndər
      </label>
      <Button type="submit" loading={pending}>{t.common.save}</Button>
    </form>
  )
}

export function PhoneVerificationForm({ phone }: { phone: string | null }) {
  const [sendState, send, sending] = useActionState(sendPhoneOtpAction, initial)
  const [verifyState, verify, verifying] = useActionState(verifyPhoneOtpAction, initial)
  const [value, setValue] = useState(phone ?? '')
  if (verifyState.ok) return <Alert tone="success">{verifyState.message}</Alert>
  return (
    <div className="space-y-4">
      <form action={send} className="flex flex-wrap items-end gap-3">
        <Field label="Telefon" error={sendState.errors?.phone} className="min-w-56 flex-1">
          {(p) => <Input {...p} name="phone" type="tel" value={value} onChange={(e) => setValue(e.target.value)} placeholder="050 123 45 67" />}
        </Field>
        <Button type="submit" variant="secondary" loading={sending}>SMS kod göndər</Button>
      </form>
      {sendState.message ? <Alert tone={sendState.ok ? 'info' : 'danger'}>{sendState.message}</Alert> : null}
      {sendState.ok ? (
        <form action={verify} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="phone" value={value} />
          <Field label="SMS kodu" error={verifyState.errors?.token} className="w-40">
            {(p) => <Input {...p} name="token" inputMode="numeric" autoComplete="one-time-code" maxLength={8} />}
          </Field>
          <Button type="submit" loading={verifying}>Təsdiqlə</Button>
        </form>
      ) : null}
      {verifyState.message && !verifyState.ok ? <Alert tone="danger">{verifyState.message}</Alert> : null}
    </div>
  )
}
