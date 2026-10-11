'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import {
  loginAction,
  registerAction,
  requestPasswordResetAction,
  updatePasswordAction,
  type FormState,
} from './actions'

const initial: FormState = {}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial)
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ''} />
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <Field label="E-poçt" error={state.errors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />}
      </Field>
      <Field label="Şifrə" error={state.errors?.password}>
        {(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <div className="flex justify-end">
        <Link href="/sifre-berpa" className="text-sm font-medium text-accent-text hover:underline">
          Şifrəni unutmusunuz?
        </Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Daxil ol
      </Button>
    </form>
  )
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial)
  if (state.ok) {
    return (
      <Alert tone="success" title="Təsdiq linki göndərildi">
        {state.message}
      </Alert>
    )
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <Field label="Ad və ya mağaza adı" error={state.errors?.display_name}>
        {(p) => <Input {...p} name="display_name" autoComplete="name" required maxLength={80} defaultValue={state.values?.display_name} />}
      </Field>
      <Field label="E-poçt" error={state.errors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />}
      </Field>
      <Field label="Şifrə" error={state.errors?.password} hint="Ən azı 8 simvol, hərf və rəqəm.">
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" required minLength={8} />}
      </Field>
      <Field label="Şifrənin təkrarı" error={state.errors?.password_confirm}>
        {(p) => <Input {...p} name="password_confirm" type="password" autoComplete="new-password" required />}
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="accept_terms" className="mt-0.5 size-4.5 accent-[var(--accent)]" required />
          <span>
            <Link href="/istifade-sertleri" className="font-medium text-accent-text hover:underline" target="_blank">
              İstifadə şərtləri
            </Link>{' '}
            və{' '}
            <Link href="/mexfilik-siyaseti" className="font-medium text-accent-text hover:underline" target="_blank">
              məxfilik siyasəti
            </Link>{' '}
            ilə tanış oldum və razıyam.
          </span>
        </label>
        {state.errors?.accept_terms ? <p className="mt-1.5 text-xs font-medium text-danger">{state.errors.accept_terms}</p> : null}
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Qeydiyyatdan keç
      </Button>
    </form>
  )
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial)
  if (state.ok) return <Alert tone="success">{state.message}</Alert>
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <Field label="E-poçt" error={state.errors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" required />}
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Bərpa linki göndər
      </Button>
    </form>
  )
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial)
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <Field label="Yeni şifrə" error={state.errors?.password} hint="Ən azı 8 simvol, hərf və rəqəm.">
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" required minLength={8} />}
      </Field>
      <Field label="Yeni şifrənin təkrarı" error={state.errors?.password_confirm}>
        {(p) => <Input {...p} name="password_confirm" type="password" autoComplete="new-password" required />}
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Şifrəni yenilə
      </Button>
    </form>
  )
}
