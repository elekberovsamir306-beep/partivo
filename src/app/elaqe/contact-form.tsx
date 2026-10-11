'use client'

import { useActionState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { t } from '@/i18n'
import { submitSupportAction, type ContactState } from './actions'

export function ContactForm({ defaults }: { defaults: { name: string; email: string } }) {
  const [state, action, pending] = useActionState(submitSupportAction, {} as ContactState)
  if (state.ok) return <Alert tone="success" title="Göndərildi">{state.message}</Alert>
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Adınız" error={state.errors?.name}>
          {(p) => <Input {...p} name="name" defaultValue={defaults.name} autoComplete="name" required maxLength={80} />}
        </Field>
        <Field label="E-poçt" error={state.errors?.email}>
          {(p) => <Input {...p} name="email" type="email" defaultValue={defaults.email} autoComplete="email" required />}
        </Field>
      </div>
      <Field label="Mövzu">
        {(p) => (
          <Select {...p} name="topic" defaultValue="general">
            {Object.entries(t.supportTopics).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Başlıq" error={state.errors?.subject}>
        {(p) => <Input {...p} name="subject" required maxLength={160} />}
      </Field>
      <Field label="Mesaj" error={state.errors?.message}>
        {(p) => <Textarea {...p} name="message" required maxLength={4000} />}
      </Field>
      {/* Honeypot field, hidden from people and assistive tech */}
      <div className="hidden" aria-hidden="true">
        <label>Vebsayt<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Button type="submit" size="lg" loading={pending}>Göndər</Button>
    </form>
  )
}
